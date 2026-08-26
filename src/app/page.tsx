import { Suspense } from "react";
import Hero from "@/components/landing/hero";
import GymsSection from "@/components/landing/gyms-section";
import PlansSection from "@/components/landing/plans-section";
import ContactSection from "@/components/landing/contact-section";
import RegistrationTracker from "@/components/analytics/registration-tracker";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";

export default async function Home() {
  await requireCompleteProfileIfSignedIn();

  return (
    <>
      <Suspense fallback={null}>
        <RegistrationTracker />
      </Suspense>
      <Hero />
      <GymsSection />
      <PlansSection />
      <ContactSection />
    </>
  );
}
