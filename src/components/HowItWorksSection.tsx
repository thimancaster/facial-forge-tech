import { motion } from "framer-motion";
import { Camera, Brain, Syringe, FileCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "Captura Padronizada",
    description: "Fotografe seguindo o protocolo de 8 poses faciais guiadas pelo sistema.",
    number: "01",
  },
  {
    icon: Brain,
    title: "Análise por IA",
    description: "Nossa IA processa as imagens e mapeia a anatomia muscular em segundos.",
    number: "02",
  },
  {
    icon: Syringe,
    title: "Dosagem Sugerida",
    description: "Receba sugestões de dosagem baseadas em evidências e ajuste conforme necessário.",
    number: "03",
  },
  {
    icon: FileCheck,
    title: "Documentação",
    description: "Exporte relatórios PDF profissionais com mapeamento 3D e histórico do paciente.",
    number: "04",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-mist relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Como Funciona
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto">
              O NeuroAesthetics AI revoluciona o planejamento de procedimentos estéticos ao combinar 
              padronização fotográfica com análise anatômica inteligente.
            </p>
          </motion.div>

          {/* Steps Timeline */}
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Number Circle */}
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-card to-muted border border-primary/20 flex items-center justify-center shadow-lg relative z-10">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <step.icon className="h-10 w-10 text-primary-foreground" />
                      </div>
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center shadow-md z-20">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3 font-serif">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <ArrowRight className="w-6 h-6 text-primary/40 rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};