import { useApp } from "@/context/AppContext";
import { Brain, Sparkles, ArrowRight, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function WelcomeScreen() {
  const { loadDemoData } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg space-y-8"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 rounded-2xl gradient-violet mx-auto flex items-center justify-center"
        >
          <Brain className="text-primary-foreground" size={40} />
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to <span className="text-gradient-violet">SpendWise AI</span>
          </h1>
          <p className="text-muted-foreground text-lg">Your AI-powered personal finance companion</p>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
          {["Track", "Analyze", "Save"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {i + 1}
              </div>
              <span>{step}</span>
              {i < 2 && <ArrowRight size={14} className="ml-2 text-border" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/add")} className="gradient-violet text-primary-foreground gap-2 px-6 h-11">
            <Sparkles size={18} />
            Get Started
          </Button>
          <Button
            variant="outline"
            onClick={() => { loadDemoData(); }}
            className="gap-2 px-6 h-11"
          >
            Load Demo Data
          </Button>
        </div>

        {/* Developer Credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="pt-8 border-t border-border/50"
        >
          <p className="text-sm text-muted-foreground">
            Designed & Developed by
          </p>
          <p className="text-base font-semibold text-foreground mt-1">
            Himanshu Kundan Tapde
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a
              href="https://github.com/Himanshu431-coder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github size={18} />
            </a>
            <a
              href="https://linkedin.com/in/himanshutapde"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}