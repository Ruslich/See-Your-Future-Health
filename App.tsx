import React, { useState } from 'react';
import StepForm from './components/StepForm';
import Dashboard from './components/Dashboard';
import { generateHealthProjection } from './services/geminiService';
import { UserProfile, SimulationResponse } from './types';
import { Loader2 } from 'lucide-react';

type ViewState = 'form' | 'loading' | 'dashboard';

// Simple JS/CSS animated background component
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-200/40 blur-[100px] animate-blob mix-blend-multiply filter opacity-70" />
    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/40 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter opacity-70" />
    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply filter opacity-70" />
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('form');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);

  const handleFormComplete = async (data: UserProfile) => {
    setUserProfile(data);
    setView('loading');
    
    try {
      const result = await generateHealthProjection(data);
      setSimulationData(result);
      setView('dashboard');
    } catch (error) {
      console.error("Simulation failed", error);
      // Ideally show error state, for now reset
      setView('form');
    }
  };

  const handleReset = () => {
    setView('form');
    setSimulationData(null);
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-900">
      
      {/* Animated Background only visible on form view, or persist gently */}
      {(view === 'form' || view === 'loading') && <AnimatedBackground />}

      {view === 'form' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="mb-8 text-center fade-in z-10 relative">
             <div className="inline-block px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold tracking-wide uppercase mb-3">Health Projection AI</div>
             <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">See Your Future Health</h1>
             <p className="text-slate-600 text-lg max-w-lg mx-auto leading-relaxed">Discover how your lifestyle today shapes your tomorrow using advanced population health models.</p>
          </div>
          <StepForm onComplete={handleFormComplete} />
        </div>
      )}

      {view === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-6" />
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Analyzing Health Trajectory...</h2>
          <p className="text-slate-500 animate-pulse">Consulting population health models</p>
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