import type { BotContext, BotConversation } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language, ServiceType, Urgency } from '@jobbarm/shared'
import { SERVICE_TYPES, URGENCIES, DISTRICTS, localizedLabel, CURRENT_YEAR } from '@jobbarm/shared'
import {
  carsKeyboard,
  carMakeKeyboard,
  serviceTypeKeyboard,
  urgencyKeyboard,
  drivableKeyboard,
  confirmRequestKeyboard,
  districtKeyboard,
  photosKeyboard,
} from '../keyboards.js'
import { consumeDailyLimit, DAILY_REQUEST_LIMIT } from '../../lib/rateLimit.js'

export const CREATE_REQUEST = 'createRequest'

export async function createRequest(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  // Defense-in-depth: a user banned mid-flow must not complete creation.
  const banned = await conversation.external(async () => {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
    return u?.isBanned ?? true
  })
  if (banned) {
    await ctx.reply(t(lang, 'banned'))
    return
  }

  // Returns trimmed text, or null on a non-text message (wizard aborts).
  const askText = async (key: string): Promise<string | null> => {
    await ctx.reply(t(lang, key))
    const res = await conversation.wait()
    const text = res.message?.text
    if (!text) {
      await ctx.reply(t(lang, 'reqAbortNoText'))
      return null
    }
    return text.trim()
  }

  // ----- pick or create a car -----
  const cars = await conversation.external(() =>
    db.car.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, make: true, model: true, year: true },
    })
  )

  await ctx.reply(t(lang, cars.length ? 'reqPickCar' : 'reqNoCarsHint'), {
    reply_markup: carsKeyboard(lang, cars),
  })
  const carCb = await conversation.waitForCallbackQuery(/^rqcar:(.+)$/)
  await carCb.answerCallbackQuery()
  let carId = carCb.match![1]

  if (carId === '__add__') {
    // make (buttons incl. Other → free text)
    await ctx.reply(t(lang, 'reqCarMake'), { reply_markup: carMakeKeyboard(lang) })
    const mkCb = await conversation.waitForCallbackQuery(/^rqmk:(.+)$/)
    await mkCb.answerCallbackQuery()
    let make: string
    if (mkCb.match![1] === '__other__') {
      const typed = await askText('reqCarMakeOther')
      if (typed === null) return
      make = typed
    } else {
      make = mkCb.match![1]
    }

    const model = await askText('reqCarModel')
    if (model === null) return

    let year = 0
    for (;;) {
      const yRaw = await askText('reqCarYear')
      if (yRaw === null) return
      const y = Number.parseInt(yRaw, 10)
      if (Number.isInteger(y) && y >= 1950 && y <= CURRENT_YEAR + 1) {
        year = y
        break
      }
      await ctx.reply(t(lang, 'reqCarYearBad'))
    }

    const plateRaw = await askText('reqCarPlate')
    if (plateRaw === null) return
    const licensePlate = plateRaw === '-' ? null : plateRaw

    const created = await conversation.external(() =>
      db.car.create({
        data: { userId: user.id, make, model, year, licensePlate },
        select: { id: true },
      })
    )
    carId = created.id
    await ctx.reply(t(lang, 'reqCarSaved'))
  }

  // ----- service type (single select) -----
  await ctx.reply(t(lang, 'reqServiceType'), { reply_markup: serviceTypeKeyboard(lang) })
  const svcCb = await conversation.waitForCallbackQuery(/^rqsvc:(.+)$/)
  await svcCb.answerCallbackQuery()
  const serviceType = svcCb.match![1] as ServiceType

  // ----- description -----
  const description = await askText('reqDescription')
  if (description === null) return

  // ----- photos (0–5) -----
  const photos: string[] = []
  await ctx.reply(t(lang, 'reqPhotos'), { reply_markup: photosKeyboard(lang) })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'photos:skip' || upd.callbackQuery?.data === 'photos:done') {
      await upd.answerCallbackQuery()
      break
    }
    const photo = upd.message?.photo
    if (photo && photo.length > 0) {
      photos.push(photo[photo.length - 1].file_id)
      if (photos.length >= 5) {
        await ctx.reply(t(lang, 'reqPhotosMore', { n: photos.length }))
        break
      }
      await ctx.reply(t(lang, 'reqPhotosMore', { n: photos.length }), {
        reply_markup: photosKeyboard(lang),
      })
    }
    // ignore anything else; loop until skip/done or 5 photos
  }

  // ----- optional voice -----
  let voiceFileId: string | null = null
  await ctx.reply(t(lang, 'reqVoice'), {
    reply_markup: { inline_keyboard: [[{ text: t(lang, 'reqVoiceSkip'), callback_data: 'rqvoice:skip' }]] },
  })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'rqvoice:skip') {
      await upd.answerCallbackQuery()
      break
    }
    if (upd.message?.voice) {
      voiceFileId = upd.message.voice.file_id
      break
    }
    // ignore anything else; loop until a voice message or skip
  }

  // ----- district -----
  await ctx.reply(t(lang, 'reqDistrict'), { reply_markup: districtKeyboard(lang) })
  const distCb = await conversation.waitForCallbackQuery(/^dist:(.+)$/)
  await distCb.answerCallbackQuery()
  const district = distCb.match![1]

  // ----- urgency -----
  await ctx.reply(t(lang, 'reqUrgency'), { reply_markup: urgencyKeyboard(lang) })
  const urgCb = await conversation.waitForCallbackQuery(/^rqurg:(.+)$/)
  await urgCb.answerCallbackQuery()
  const urgency = urgCb.match![1] as Urgency

  // ----- drivable -----
  await ctx.reply(t(lang, 'reqDrivable'), { reply_markup: drivableKeyboard(lang) })
  const drvCb = await conversation.waitForCallbackQuery(/^rqdrv:(0|1)$/)
  await drvCb.answerCallbackQuery()
  const isDrivable = drvCb.match![1] === '1'

  // ----- confirm -----
  const carRow = cars.find((c) => c.id === carId)
  const carLabel = carRow
    ? `${carRow.make} ${carRow.model} ${carRow.year}`
    : await conversation.external(async () => {
        const c = await db.car.findUnique({
          where: { id: carId },
          select: { make: true, model: true, year: true },
        })
        return c ? `${c.make} ${c.model} ${c.year}` : '—'
      })
  const svcLabel = localizedLabel(
    SERVICE_TYPES.find((s) => s.key === serviceType)!.label,
    lang
  )
  const urgLabel = localizedLabel(URGENCIES.find((u) => u.key === urgency)!.label, lang)
  const distLabelObj = DISTRICTS.find((d) => d.key === district)?.label
  const distLabel = distLabelObj ? localizedLabel(distLabelObj, lang) : district

  await ctx.reply(
    t(lang, 'reqConfirm', {
      car: carLabel,
      service: svcLabel,
      district: distLabel,
      urgency: urgLabel,
      description,
    }),
    { reply_markup: confirmRequestKeyboard(lang) }
  )
  const okCb = await conversation.waitForCallbackQuery(/^rqok:(0|1)$/)
  await okCb.answerCallbackQuery()
  if (okCb.match![1] === '0') {
    await ctx.reply(t(lang, 'reqCancelled'))
    return
  }

  // ----- rate-limit + persist (side effects) -----
  const allowed = await conversation.external(() =>
    consumeDailyLimit('req', user.id, DAILY_REQUEST_LIMIT)
  )
  if (!allowed) {
    await ctx.reply(t(lang, 'reqRateLimited'))
    return
  }

  await conversation.external(async () => {
    await db.request.create({
      data: {
        clientId: user.id,
        carId,
        serviceType,
        description,
        voiceFileId,
        photos,
        district,
        urgency,
        isDrivable,
        // status defaults to OPEN (schema); matching/notify is Phase 3.
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
  })

  await ctx.reply(t(lang, 'reqCreated'))
}
