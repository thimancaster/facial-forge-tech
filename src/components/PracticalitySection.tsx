import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const PracticalitySection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-mist relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/20 shadow-xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80" 
                alt="Análise Facial com Overlay Anatômico"
                className="w-full h-full object-cover"
              />
              {/* Overlay gráfico simulado */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-3/4 h-3/4 opacity-60" viewBox="0 0 200 200">
                  <circle cx="100" cy="80" r="3" fill="hsl(var(--accent))" />
                  <circle cx="100" cy="100" r="3" fill="hsl(var(--accent))" />
                  <circle cx="100" cy="120" r="3" fill="hsl(var(--accent))" />
                  <line x1="100" y1="80" x2="100" y2="120" stroke="hsl(var(--accent))" strokeWidth="1" />
                  <line x1="80" y1="80" x2="120" y2="80" stroke="hsl(var(--accent))" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1="80" y1="120" x2="120" y2="120" stroke="hsl(var(--accent))" strokeWidth="1" strokeDasharray="2,2" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-accent uppercase tracking-wider">
                Tecnologia Avançada
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
              Descubra a Praticidade
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-6 font-light">
              Nossa plataforma utiliza inteligência artificial avançada para analisar a anatomia facial 
              com precisão cirúrgica. Em poucos segundos, você obtém um mapeamento completo dos músculos 
              faciais, proporções áureas e recomendações de dosagem personalizadas.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed font-light">
              Padronização fotográfica, análise anatômica automatizada e protocolos de segurança integrados 
              em uma única ferramenta. Tudo pensado para elevar a qualidade dos seus procedimentos de 
              harmonização facial.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
