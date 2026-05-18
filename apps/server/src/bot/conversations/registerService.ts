import type { BotContext, BotConversation } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language, ServiceType } from '@jobbarm/shared'
import { SERVICE_TYPES, DISTRICTS, localizedLabel } from '@jobbarm/shared'
import { districtKeyboard, specsKeyboard, photosKeyboard } from '../keyboards.js'
import { notifyAdmins, escapeMd } from '../notifications.js'

export const REGISTER_SERVICE = 'registerService'

export async function registerService(
  conversation: BotConversation,
  ctx: BotContext
): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  // Defense-in-depth: a user banned mid-flow must not complete registration.
  const banned = await conversation.external(async () => {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
    return u?.isBanned ?? true
  })
  if (banned) {
    await ctx.reply(t(lang, 'banned'))
    return
  }

  const askText = async (key: string): Promise<string> => {
    await ctx.reply(t(lang, key))
    const res = await conversation.waitFor('message:text')
    return res.message.text.trim()
  }

  const name = await askText('regName')
  const descRaw = await askText('regDescription')
  const description = descRaw === '-' ? null : descRaw
  const address = await askText('regAddress')

  // District (inline buttons)
  await ctx.reply(t(lang, 'regDistrict'), { reply_markup: districtKeyboard(lang) })
  const distCb = await conversation.waitForCallbackQuery(/^dist:(.+)$/)
  await distCb.answerCallbackQuery()
  const district = distCb.match![1]

  const phoneNumber = await askText('regPhone')

  // Specializations (multi-select toggle)
  const selected = new Set<string>()
  await ctx.reply(t(lang, 'regSpecs'), { reply_markup: specsKeyboard(lang, selected) })
  for (;;) {
    const cb = await conversation.waitForCallbackQuery(/^spec:(.+)$/)
    const value = cb.match![1]
    if (value === '__done__') {
      if (selected.size === 0) {
        await cb.answerCallbackQuery({ text: t(lang, 'regSpecsEmpty'), show_alert: true })
        continue
      }
      await cb.answerCallbackQuery()
      break
    }
    if (selected.has(value)) selected.delete(value)
    else selected.add(value)
    await cb.answerCallbackQuery()
    await cb.editMessageReplyMarkup({ reply_markup: specsKeyboard(lang, selected) })
  }
  const specializations = SERVICE_TYPES.map((s) => s.key).filter((k) =>
    selected.has(k)
  ) as ServiceType[]

  // Photos (optional, up to 5)
  const photos: string[] = []
  await ctx.reply(t(lang, 'regPhotos'), { reply_markup: photosKeyboard(lang) })
  for (;;) {
    const upd = await conversation.wait()
    if (upd.callbackQuery?.data === 'photos:skip' || upd.callbackQuery?.data === 'photos:done') {
      await upd.answerCallbackQuery()
      break
    }
    const photo = upd.message?.photo
    if (photo && photo.length > 0) {
      photos.push(photo[photo.length - 1].file_id)
      if (photos.length >= 5) break
      await ctx.reply(t(lang, 'regPhotosMore', { n: photos.length }), {
        reply_markup: photosKeyboard(lang),
      })
    }
    // ignore anything else; loop until skip/done or 5 photos
  }

  // Persist + notify admins (side effects -> conversation.external)
  await conversation.external(async () => {
    await db.serviceProfile.upsert({
      where: { userId: user.id },
      update: {
        name,
        description,
        address,
        district,
        phoneNumber,
        specializations,
        photos,
        isVerified: false,
      },
      create: {
        userId: user.id,
        name,
        description,
        address,
        district,
        phoneNumber,
        specializations,
        photos,
        isVerified: false,
        isActive: true,
      },
    })
    const distLabel =
      DISTRICTS.find((d) => d.key === district)?.label
    const distText = distLabel ? localizedLabel(distLabel, lang) : district
    const specsText = specializations
      .map((k) => {
        const s = SERVICE_TYPES.find((x) => x.key === k)
        return s ? localizedLabel(s.label, lang) : k
      })
      .join(', ')
    await notifyAdmins(
      t('ru', 'adminNewService', {
        name: escapeMd(name),
        district: distText,
        address: escapeMd(address),
        phone: escapeMd(phoneNumber),
        specs: specsText,
      })
    )
  })

  await ctx.reply(t(lang, 'regDone'))
}
