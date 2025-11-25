import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Scan, Grid3x3, Syringe, ArrowRight } from "lucide-react";

const floatingCards = [
  {
    icon: Scan,
    title: "Mapeamento",
    description: "Análise facial precisa",
    delay: 0.2,
  },
  {
    icon: Grid3x3,
    title: "Simetria",
    description: "Proporções áureas",
    delay: 0.4,
  },
  {
    icon: Syringe,
    title: "Dosagem",
    description: "Protocolo personalizado",
    delay: 0.6,
  },
];

export const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-mist to-fog pt-20">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            id="hero-title"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              A Ciência da Precisão na
              <span className="block bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">
                Harmonização Facial
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto"
            id="hero-subtitle"
          >
            Padronização fotográfica e análise anatômica guiada por IA para injetores de elite.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            id="hero-cta"
          >
            <Button size="lg" className="text-lg px-8 py-6 gap-3 bg-gradient-to-r from-primary to-primary-light hover:opacity-90 transition-opacity">
              Começar Análise
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>

          {/* Floating Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {floatingCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: card.delay }}
                className="floating-card"
                id={`floating-card-${index}`}
              >
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center mb-4 mx-auto">
                      <card.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
