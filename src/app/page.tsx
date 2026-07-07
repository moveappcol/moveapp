import Hero from "@/components/landing/hero";
import GymsSection from "@/components/landing/gyms-section";
import PlansSection from "@/components/landing/plans-section";

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Hero />
      <GymsSection />
      <PlansSection />
    </>
  );
}
