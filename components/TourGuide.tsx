import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

export interface TourStep {
  target: string; // ID of the element to highlight (e.g., 'tour-button')
  title: string;
  content: string;
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export const TourGuide: React.FC<TourGuideProps> = ({ steps, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      updatePosition(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition(currentStep);
      window.addEventListener('resize', () => updatePosition(currentStep));
      return () => window.removeEventListener('resize', () => updatePosition(currentStep));
    }
  }, [currentStep, isOpen]);

  const updatePosition = (stepIndex: number) => {
    if (!steps[stepIndex]) return;
    
    // Find element by ID
    const element = document.getElementById(steps[stepIndex].target);
    
    if (element) {
      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Get coordinates
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // If element not found (e.g., dynamic content empty), skip or default center
      setTargetRect(null);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  // Safety Check: If step is undefined (e.g. no steps for this page), don't render
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Dark Overlay with "Spotlight" effect using mix-blend-mode or simply 4 divs */}
      {/* We use a simple approach: A semi-transparent div for the whole screen, and a high z-index div for the target */}
      
      <div className="absolute inset-0 bg-slate-900/80 transition-colors duration-500" onClick={onClose}></div>

      {/* Highlight Box */}
      {targetRect && (
        <div 
          className="absolute border-4 border-yellow-400 rounded-lg shadow-[0_0_50px_rgba(250,204,21,0.5)] transition-all duration-300 ease-in-out pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className="absolute transition-all duration-300"
        style={{
          top: targetRect ? Math.min(window.innerHeight - 200, Math.max(20, targetRect.bottom + 20)) : '50%',
          left: targetRect ? Math.min(window.innerWidth - 320, Math.max(20, targetRect.left)) : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        <div className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-600 p-5 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
              Paso {currentStep + 1} de {steps.length}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {step.title}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {step.content}
          </p>

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white disabled:opacity-30 flex items-center"
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 shadow-lg transition-transform active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              {currentStep !== steps.length - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};