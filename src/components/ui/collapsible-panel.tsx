import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  iconColor?: string;
}

export function CollapsiblePanel({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  iconColor = "text-primary"
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      "bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200 overflow-hidden",
      className
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors",
          headerClassName
        )}
      >
        <div className="flex items-center gap-2">
          {icon && <span className={iconColor}>{icon}</span>}
          <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className={cn("px-3 pb-3", contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
