import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { usePhysicsEngine } from "@/hooks/usePhysicsEngine";

const Index = () => {
  const [physicsActive, setPhysicsActive] = useState(false);

  usePhysicsEngine(physicsActive);

  const handlePhysicsToggle = () => {
    setPhysicsActive(!physicsActive);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onPhysicsToggle={handlePhysicsToggle} physicsActive={physicsActive} />
      <HeroSection />
      <FeaturesGrid />
    </div>
  );
};

export default Index;
