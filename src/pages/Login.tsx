import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100),
  fullName: z.string().max(100).optional(),
});

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const validate = () => {
    try {
      authSchema.parse({ email, password, fullName: mode === "signup" ? fullName : undefined });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as keyof typeof errors] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    
    if (mode === "login") {
      await signIn(email, password);
    } else {
      await signUp(email, password, fullName);
    }
    
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Imagem Artística */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 overflow-hidden">
        {/* Overlay Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)"/>
          </svg>
        </div>
        
        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="mb-8">
            <svg className="w-48 h-48 opacity-90" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="100" cy="100" rx="70" ry="90" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M60 70 Q100 60 140 70" stroke="hsl(var(--accent))" strokeWidth="2" fill="none"/>
              <path d="M70 85 Q100 80 130 85" stroke="hsl(var(--accent))" strokeWidth="1.5" fill="none"/>
              <path d="M80 100 Q100 95 120 100" stroke="hsl(var(--accent))" strokeWidth="1" fill="none"/>
              <circle cx="75" cy="75" r="4" fill="hsl(var(--accent))"/>
              <circle cx="125" cy="75" r="4" fill="hsl(var(--accent))"/>
              <circle cx="100" cy="65" r="4" fill="hsl(var(--accent))"/>
              <circle cx="85" cy="82" r="3" fill="hsl(var(--accent))" opacity="0.7"/>
              <circle cx="115" cy="82" r="3" fill="hsl(var(--accent))" opacity="0.7"/>
            </svg>
          </div>
          
          <h2 className="text-3xl font-light mb-4 text-center">
            Precisão Científica
          </h2>
          <p className="text-white/80 text-center max-w-md leading-relaxed">
            Plataforma de análise facial baseada em evidências para profissionais que buscam excelência em harmonização.
          </p>
          
          <div className="mt-12 flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-light text-accent">98%</div>
              <div className="text-xs text-white/60 mt-1">Precisão</div>
            </div>
            <div className="w-px bg-white/20"/>
            <div className="text-center">
              <div className="text-3xl font-light text-accent">5k+</div>
              <div className="text-xs text-white/60 mt-1">Análises</div>
            </div>
            <div className="w-px bg-white/20"/>
            <div className="text-center">
              <div className="text-3xl font-light text-accent">500+</div>
              <div className="text-xs text-white/60 mt-1">Médicos</div>
            </div>
          </div>
        </div>
        
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl"/>
        <div className="absolute -top-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-2xl"/>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl font-light text-primary">NeuroAesthetics</h1>
          </div>
          
          <div className="mb-8">
            <h1 className="text-2xl font-light text-foreground mb-2">
              {mode === "login" ? "Portal do Médico" : "Criar Conta"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === "login" ? "Acesse sua conta para continuar" : "Preencha os dados para se cadastrar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Nome Completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 bg-muted/30 border-border/50 focus:border-primary"
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-muted/30 border-border/50 focus:border-primary"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                {mode === "login" && (
                  <button type="button" className="text-xs text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-muted/30 border-border/50 focus:border-primary pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                  {mode === "login" ? "Entrando..." : "Criando conta..."}
                </>
              ) : (
                mode === "login" ? "Entrar" : "Criar Conta"
              )}
            </Button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-border"/>
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border"/>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
              <button 
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {mode === "login" ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground">
              Ao entrar, você concorda com nossos{" "}
              <a href="#" className="underline hover:text-foreground">Termos de Uso</a>
              {" "}e{" "}
              <a href="#" className="underline hover:text-foreground">Política de Privacidade</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
