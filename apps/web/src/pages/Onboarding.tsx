import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store";
import { useT, categoryName } from "@/lib/i18n";
import { getCategories, putMe, postMeMaster } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Language } from "@jobbarm/shared";

type Step = 1 | 2 | 3 | 4;

export default function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [lang, setLang] = useState<Language>("hy");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"customer" | "master" | "both">("customer");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { setLanguage, setIsMaster, setActiveRole, setIsOnboarded } = useStore();
  const t = useT();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    enabled: step === 4,
  });

  const handleStep1 = () => {
    setLanguage(lang);
    setStep(2);
  };

  const handleStep2 = () => {
    if (!name.trim() || !phone.trim()) return;
    setStep(3);
  };

  const handleStep3 = () => {
    if (role === "master" || role === "both") {
      setStep(4);
    } else {
      void handleFinish();
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await putMe({ name: name.trim(), phone: phone.trim(), language: lang });
      const isMaster = role === "master" || role === "both";
      if (isMaster && selectedCats.length > 0) {
        await postMeMaster(selectedCats);
      }
      setIsMaster(isMaster);
      setActiveRole(role === "master" ? "master" : "customer");
      setIsOnboarded(true);
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  return (
    <div className="min-h-screen flex flex-col px-6 pb-6 tma-safe-top">
      <div className="flex gap-2 mb-8 justify-center">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={cn("w-2 h-2 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-secondary")}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col gap-6">
          <h1 className="text-xl font-semibold">{t.onboarding.step1Title}</h1>
          <div className="flex flex-col gap-3">
            {(["hy", "ru", "en"] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left font-medium transition-colors",
                  lang === l ? "border-primary bg-primary/10" : "border-secondary"
                )}
              >
                {l === "hy" ? "🇦🇲 Հայերեն" : l === "ru" ? "🇷🇺 Русский" : "🇬🇧 English"}
              </button>
            ))}
          </div>
          <button
            onClick={handleStep1}
            className="mt-auto w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            {t.onboarding.next}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col gap-6">
          <h1 className="text-xl font-semibold">{t.onboarding.step2Title}</h1>
          <div className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.namePlaceholder}
              className="w-full p-3 rounded-xl bg-secondary outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.onboarding.phonePlaceholder}
              type="tel"
              className="w-full p-3 rounded-xl bg-secondary outline-none"
            />
          </div>
          <button
            onClick={handleStep2}
            disabled={!name.trim() || !phone.trim()}
            className="mt-auto w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {t.onboarding.next}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col gap-6">
          <h1 className="text-xl font-semibold">{t.onboarding.step3Title}</h1>
          <div className="flex flex-col gap-3">
            {(
              [
                { value: "customer", label: t.onboarding.asCustomer, desc: t.onboarding.asCustomerDesc },
                { value: "master", label: t.onboarding.asMaster, desc: t.onboarding.asMasterDesc },
                { value: "both", label: t.onboarding.bothRoles, desc: "" },
              ] as const
            ).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setRole(value)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-colors",
                  role === value ? "border-primary bg-primary/10" : "border-secondary"
                )}
              >
                <div className="font-medium">{label}</div>
                {desc && <div className="text-sm text-muted">{desc}</div>}
              </button>
            ))}
          </div>
          <button
            onClick={handleStep3}
            className="mt-auto w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
          >
            {role === "customer" ? t.onboarding.finish : t.onboarding.next}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex-1 flex flex-col gap-6">
          <h1 className="text-xl font-semibold">{t.onboarding.step4Title}</h1>
          <p className="text-sm text-muted">{t.onboarding.selectCategories}</p>
          <div className="flex flex-wrap gap-2 flex-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm transition-colors",
                  selectedCats.includes(cat.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-secondary"
                )}
              >
                {categoryName(cat, lang)}
              </button>
            ))}
          </div>
          <button
            onClick={() => void handleFinish()}
            disabled={selectedCats.length === 0 || submitting}
            className="mt-auto w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {submitting ? "..." : t.onboarding.finish}
          </button>
        </div>
      )}
    </div>
  );
}
