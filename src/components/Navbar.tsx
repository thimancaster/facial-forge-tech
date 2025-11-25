import { Button } from "@/components/ui/button";
import { LogIn, Atom } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  onPhysicsToggle: () => void;
  physicsActive: boolean;
}

export const Navbar = ({ onPhysicsToggle, physicsActive }: NavbarProps) => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      id="navbar"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">N</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              NeuroAesthetics AI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground/80 hover:text-primary transition-colors">
              Recursos
            </a>
            <a href="#benefits" className="text-foreground/80 hover:text-primary transition-colors">
              Benefícios
            </a>
            <a href="#pricing" className="text-foreground/80 hover:text-primary transition-colors">
              Planos
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPhysicsToggle}
              className={`relative ${physicsActive ? 'text-accent' : 'text-muted-foreground'}`}
              title={physicsActive ? "Desativar Física" : "Ativar Modo Física"}
            >
              <Atom className="h-5 w-5" />
              {physicsActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
            
            <Button variant="outline" className="gap-2">
              <LogIn className="h-4 w-4" />
              Login Médico
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
