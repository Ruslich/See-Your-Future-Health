import React, { useState } from 'react';
import StepForm from './components/StepForm';
import BaselineAnalysis from './components/BaselineAnalysis';
import Dashboard from './components/Dashboard';
import { generateHealthProjection } from './services/geminiService';
import { UserProfile, SimulationResponse } from './types';
import { Loader2 } from 'lucide-react';

type ViewState = 'form' | 'baseline' | 'loading' | 'dashboard';

// Simple JS/CSS animated background component
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-100">
    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-300/40 blur-[120px] animate-blob mix-blend-multiply" />
    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/40 blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply" />
    <div className="absolute bottom-[-20%] left-[20%] w-[70%] h-[70%] rounded-full bg-indigo-300/40 blur-[120px] animate-blob animation-delay-4000 mix-blend-multiply" />
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('form');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);

  const handleFormComplete = (data: UserProfile) => {
    setUserProfile(data);
    setView('baseline');
  };

  const handleStartSimulation = async () => {
    if (!userProfile) return;
    setView('loading');
    
    try {
      const result = await generateHealthProjection(userProfile);
      setSimulationData(result);
      setView('dashboard');
    } catch (error) {
      console.error("Simulation failed", error);
      setView('baseline'); // Return to baseline on error? Or form?
    }
  };

  const handleReset = () => {
    setView('form');
    setSimulationData(null);
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-900">
      
      {/* Animated Background only visible on form/baseline views */}
      {(view === 'form' || view === 'baseline' || view === 'loading') && <AnimatedBackground />}

      {view === 'form' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="mb-8 text-center fade-in z-10 relative">
             <div className="inline-block px-3 py-1 bg-white/50 backdrop-blur border border-white/50 text-teal-800 rounded-full text-xs font-bold tracking-wide uppercase mb-3 shadow-sm">
                AI Health Projection
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">See Your Future Health</h1>
             <p className="text-slate-600 font-medium text-lg max-w-lg mx-auto leading-relaxed">
               Discover how your lifestyle today shapes your tomorrow using advanced population health models.
             </p>
          </div>
          <StepForm onComplete={handleFormComplete} />
        </div>
      )}

      {view === 'baseline' && userProfile && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <BaselineAnalysis userProfile={userProfile} onProceed={handleStartSimulation} />
        </div>
      )}

      {view === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Consulting Population Models...</h2>
          <p className="text-slate-500 font-medium animate-pulse mb-1">Analyzing UK Biobank & CDC Data</p>
          <p className="text-xs text-slate-400">Please wait while we simulate your trajectory</p>
        </div>
      )}

      {view === 'dashboard' && simulationData && userProfile && (
        <Dashboard 
          data={simulationData} 
          userProfile={userProfile} 
          onReset={handleReset} 
        />
      )}
    </div>
  );
};

export default App;