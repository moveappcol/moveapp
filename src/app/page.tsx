import { Suspense } from "react";
import Hero from "@/components/landing/hero";
import HowItWorksSection from "@/components/landing/how-it-works-section";
import GymsSection from "@/components/landing/gyms-section";
import PlansSection from "@/components/landing/plans-section";
import ContactSection from "@/components/landing/contact-section";
import RegistrationTracker from "@/components/analytics/registration-tracker";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Home() {
  await requireCompleteProfileIfSignedIn();
  const dict = getDictionary(await getLocale());

  return (
    <>
      <Suspense fallback={null}>
        <RegistrationTracker />
      </Suspense>
      <Hero />
      <HowItWorksSection />
      <GymsSection />
      <PlansSection />
      <ContactSection t={dict.home.contact} />
    </>
  );
}
