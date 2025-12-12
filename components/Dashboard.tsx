import React, { useState, useRef, useEffect } from 'react';
import { SimulationResponse, UserProfile, RiskCard, ActivityLevel, DietQuality, FastFoodFrequency, Gender, WeightPoint, ChartSpec, ScenarioItem } from '../types';
import { generateHealthProjection, explainHealthInsight } from '../services/geminiService';
import { RefreshCw, Activity, Heart, BookOpen, ArrowUpRight, ChevronLeft, ChevronRight, Zap, CigaretteOff, Apple, Dumbbell, Clock, TrendingUp, Info, Search, UtensilsCrossed, MessageCircle, X, Send, Scale, Flame, Ruler, Maximize2, HelpCircle, Target, GitBranch, ArrowRight } from 'lucide-react';
import BulletTargetCard from './BulletTargetCard';
import StackedContributionCard from './StackedContributionCard';
import MilestoneTimelineCard from './MilestoneTimelineCard';

interface DashboardProps {
  data: SimulationResponse;
  userProfile: UserProfile;
  onReset: () => void;
}

// --- Helper Functions for Metrics ---
const calculateBMI = (h: number, w: number) => {
  const hm = h/100;
  return (w / (hm * hm)).toFixed(1);
}

const calculateBMR = (p: UserProfile) => {
  let bmr = 0;
  if (p.gender === Gender.Male) {
     bmr = (10 * p.weightKg) + (6.25 * p.heightCm) - (5 * p.age) + 5;
  } else {
     bmr = (10 * p.weightKg) + (6.25 * p.heightCm) - (5 * p.age) - 161;
  }
  return Math.round(bmr);
}

const calculateWHR = (w: number, h: number) => (w/h).toFixed(2);

const getTrendInterpretation = (type: 'weight' | 'health', profile: UserProfile): string => {
  if (type === 'weight') {
    const isSedentary = profile.activityLevel === ActivityLevel.Sedentary;
    const isActive = profile.activityLevel === ActivityLevel.Active || profile.activityLevel === ActivityLevel.Moderate;
    const badDiet = profile.dietQuality === DietQuality.Poor || profile.fastFoodFrequency === FastFoodFrequency.Frequent;
    
    if (badDiet && isSedentary) return "Average adult weight gain is ~0.5kg/year. However, high processed food intake combined with low activity suggests a projected rate closer to 0.8-1.0kg/year.";
    if (isActive && !badDiet) return "Because of your consistent activity levels and balanced diet, your projected weight stability is significantly better than the population average.";
    if (isActive && badDiet) return "While you are active, your dietary choices may still contribute to gradual weight gain, albeit slower than if you were sedentary.";
    return "Your projected weight trend tracks closely with the population average for your age group, assuming current habits persist.";
  } else {
    // Health Score
    const smoker = profile.smoker;
    const isSedentary = profile.activityLevel === ActivityLevel.Sedentary;
    const poorSleep = profile.sleepHours < 6;
    
    if (smoker) return "Smoking is a major accelerator of biological aging, causing a steeper decline in health score compared to non-smokers.";
    if (isSedentary) return "Sedentary lifestyle is a key risk factor. Without regular movement, metabolic and cardiovascular health scores decline faster than average.";
    if (poorSleep) return "Chronic sleep deprivation accelerates cellular aging, contributing to a faster decline in your vitality score.";
    if (profile.activityLevel === ActivityLevel.Active) return "Your high activity level acts as a protective buffer, maintaining a higher health score for longer than the average trajectory.";
    return "Your health score follows a standard trajectory. Small improvements in diet or sleep could flatten the curve.";
  }
};


// --- Components ---

// Expanded Chart Overlay
interface ExpandedChartProps {
  type: 'health' | 'weight';
  data: any[];
  simulatedData?: any[];
  dataKey: string;
  label: string;
  userProfile: UserProfile;
  onClose: () => void;
}

const ExpandedChartOverlay: React.FC<ExpandedChartProps> = ({ type, data, simulatedData, dataKey, label, userProfile, onClose }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return null;

  const padding = { top: 40, right: 40, bottom: 40, left: 60 };
  
  // Dimensions handled via viewBox, but we need dynamic aspect ratio for fullscreen
  // We'll use a fixed coordinate system for SVG logic 1000x500
  const width = 1000;
  const height = 500;
  
  const minAge = data[0].age;
  const maxAge = data[data.length - 1].age;
  const ageRange = maxAge - minAge;

  // Calculate Y Range
  const allValues = [
    ...data.map(d => d[dataKey]),
    ...(simulatedData ? simulatedData.map(d => d[dataKey]) : [])
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueBuffer = (maxValue - minValue) * 0.1 || 5;
  const yMin = Math.floor(minValue - valueBuffer);
  const yMax = Math.ceil(maxValue + valueBuffer);
  const yRange = yMax - yMin;

  const getCoord = (age: number, val: number) => {
    const x = ((age - minAge) / ageRange) * (width - padding.left - padding.right) + padding.left;
    const y = height - padding.bottom - ((val - yMin) / yRange) * (height - padding.top - padding.bottom);
    return { x, y };
  };

  const generatePath = (dataset: any[]) => {
    return dataset.map((pt, i) => {
      const { x, y } = getCoord(pt.age, pt[dataKey]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Scale X to SVG coordinates
    const svgX = x * (width / rect.width);
    
    // Reverse calc age
    const chartWidth = width - padding.left - padding.right;
    const relativeX = svgX - padding.left;
    let percent = relativeX / chartWidth;
    percent = Math.max(0, Math.min(1, percent));
    
    const approxIndex = Math.round(percent * (data.length - 1));
    setHoverIndex(approxIndex);
  };

  const currentDataPoint = hoverIndex !== null ? data[hoverIndex] : null;
  const currentSimPoint = (hoverIndex !== null && simulatedData) ? simulatedData[hoverIndex] : null;
  const currentCoord = currentDataPoint ? getCoord(currentDataPoint.age, currentDataPoint[dataKey]) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div ref={containerRef} className="bg-white w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative border border-white/50">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
               <TrendingUp className="text-teal-600" />
               {type === 'health' ? 'Health Score Trajectory' : 'Weight Projection'}
            </h2>
             <p className="text-sm text-slate-500 font-medium">Detailed year-by-year analysis based on your profile.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
                <button 
                  onMouseEnter={() => setShowInfo(true)}
                  onMouseLeave={() => setShowInfo(false)}
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  <Info size={24} />
                </button>
                
                {/* Interpretation Popover */}
                {showInfo && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 text-white p-4 rounded-xl shadow-xl z-50 text-sm leading-relaxed border border-slate-700 animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-2 text-teal-400 font-bold uppercase text-xs tracking-widest">
                       <HelpCircle size={12} /> Personalized Insight
                    </div>
                    {getTrendInterpretation(type, userProfile)}
                  </div>
                )}
             </div>
             <button onClick={onClose} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative w-full h-full bg-slate-50">
           <svg 
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
           >
              {/* Grid Lines Y */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                 const yVal = yMin + (yRange * t);
                 const yPos = height - padding.bottom - (t * (height - padding.top - padding.bottom));
                 return (
                   <g key={t}>
                     <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                     <text x={padding.left - 10} y={yPos + 4} textAnchor="end" fontSize="12" fill="#94a3b8" fontWeight="500">{Math.round(yVal)}</text>
                   </g>
                 )
              })}

              {/* Grid Lines X (Every 10 years roughly) */}
              {data.filter((_, i) => i % Math.ceil(data.length/5) === 0).map((pt) => {
                  const { x } = getCoord(pt.age, 0);
                  return (
                    <g key={pt.age}>
                       <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                       <text x={x} y={height - padding.bottom + 20} textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="600">Age {pt.age}</text>
                    </g>
                  )
              })}

              {/* Paths */}
              <path d={generatePath(data)} fill="none" stroke={simulatedData ? "#cbd5e1" : "#0d9488"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {simulatedData && (
                <path d={generatePath(simulatedData)} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Hover Overlay */}
              {hoverIndex !== null && currentDataPoint && (
                <g>
                   {/* Vertical Line */}
                   <line 
                      x1={currentCoord?.x} y1={padding.top} 
                      x2={currentCoord?.x} y2={height - padding.bottom} 
                      stroke="#64748b" strokeWidth="2" strokeDasharray="5 5"
                   />
                   
                   {/* Original Point */}
                   <circle cx={currentCoord?.x} cy={currentCoord?.y} r="8" fill="white" stroke={simulatedData ? "#94a3b8" : "#0d9488"} strokeWidth="3" />
                   
                   {/* Simulated Point */}
                   {currentSimPoint && (
                     <circle 
                        cx={getCoord(currentSimPoint.age, currentSimPoint[dataKey]).x} 
                        cy={getCoord(currentSimPoint.age, currentSimPoint[dataKey]).y} 
                        r="8" fill="white" stroke="#10b981" strokeWidth="3" 
                     />
                   )}
                </g>
              )}
           </svg>

           {/* Floating Tooltip HTML Overlay */}
           {hoverIndex !== null && currentDataPoint && (
              <div 
                className="absolute pointer-events-none bg-white/90 backdrop-blur shadow-xl rounded-xl border border-slate-200 p-4 z-20 min-w-[180px]"
                style={{ 
                  left: `${(hoverIndex / (data.length - 1)) * 80 + 10}%`, 
                  top: '10%' // Fixed top position for stability
                }}
              >
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Age {currentDataPoint.age}</div>
                 
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${simulatedData ? 'bg-slate-400' : 'bg-teal-600'}`}></div>
                       <span className="text-sm font-semibold text-slate-600">Current Path</span>
                    </div>
                    <span className="text-lg font-bold text-slate-800">{currentDataPoint[dataKey]}</span>
                 </div>

                 {currentSimPoint && (
                   <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                         <span className="text-sm font-semibold text-emerald-700">Modified</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">{currentSimPoint[dataKey]}</span>
                   </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};


// 1. Chart
const ComparisonChart: React.FC<{ 
  original: { age: number; score: number }[]; 
  simulated?: { age: number; score: number }[] | null; 
  label: string;
  onExpand: () => void;
}> = ({ original, simulated, label, onExpand }) => {
  if (!original || original.length === 0) return null;

  const width = 100;
  const height = 45; 
  const padding = 5;
  
  const minAge = original[0].age;
  const maxAge = original[original.length - 1].age;
  const ageRange = maxAge - minAge;

  const getPoints = (data: { age: number; score: number }[]) => {
    return data.map((pt) => {
      const x = ((pt.age - minAge) / ageRange) * (width - 2 * padding) + padding;
      const y = height - ((pt.score / 100) * (height - 2 * padding) + padding);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="w-full bg-white rounded-xl p-4 border border-slate-100 mt-4 relative overflow-hidden shadow-sm group">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Health Score Trajectory (Age {minAge}-{maxAge})</h4>
        <div className="flex items-center gap-2">
             <button onClick={onExpand} className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
                <Maximize2 size={14} />
             </button>
             <div className="flex gap-3">
               <div className="flex items-center gap-1">
                 <div className={`w-2 h-2 rounded-full ${simulated ? 'bg-slate-300' : 'bg-teal-500'}`}></div>
                 <span className={`text-[9px] font-bold ${simulated ? 'text-slate-400' : 'text-teal-600'}`}>Current</span>
               </div>
               {simulated && (
                 <div className="flex items-center gap-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                   <span className="text-[9px] font-bold text-emerald-600 truncate max-w-[80px]">{label || 'Modified'}</span>
                 </div>
               )}
             </div>
        </div>
      </div>
      
      <div className="relative w-full aspect-[2.5/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#f1f5f9" strokeWidth="0.5" />

          <polyline 
            fill="none" 
            stroke={simulated ? "#cbd5e1" : "#14b8a6"} 
            strokeWidth={simulated ? "1.5" : "2.5"}
            strokeDasharray={simulated ? "3 2" : ""}
            points={getPoints(original)} 
            className="transition-all duration-1000"
          />
          
          {simulated && (
            <polyline 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="2.5" 
              points={getPoints(simulated)} 
              className="animate-draw"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

// 2. Weight Chart
const WeightChart: React.FC<{
  trajectory: WeightPoint[];
  comparison?: { age: number; weight: number }[] | null;
  label: string;
  onExpand: () => void;
}> = ({ trajectory, comparison, label, onExpand }) => {
  if (!trajectory || trajectory.length === 0) return null;

  const width = 100;
  const height = 45; 
  const padding = 5;
  
  const minAge = trajectory[0].age;
  const maxAge = trajectory[trajectory.length - 1].age;
  const ageRange = maxAge - minAge;
  
  const allWeights = [...trajectory.map(t => t.weight), ...(comparison ? comparison.map(c => c.weight) : [])];
  const minWeight = Math.min(...allWeights) - 5;
  const maxWeight = Math.max(...allWeights) + 5;
  const weightRange = maxWeight - minWeight;

  const getPoints = (data: { age: number; weight: number }[]) => {
    return data.map((pt) => {
      const x = ((pt.age - minAge) / ageRange) * (width - 2 * padding) + padding;
      const y = height - ((pt.weight - minWeight) / weightRange * (height - 2 * padding) + padding);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="w-full bg-white rounded-xl p-4 border border-slate-100 mt-4 relative overflow-hidden shadow-sm group">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Weight Projection (kg)</h4>
         <button onClick={onExpand} className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
            <Maximize2 size={14} />
         </button>
      </div>
      <div className="relative w-full aspect-[2.5/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Axis Lines */}
          <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="0.5" />
          <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e2e8f0" strokeWidth="0.5" />
          
          <polyline 
            fill="none" 
            stroke={comparison ? "#94a3b8" : "#6366f1"}
            strokeWidth={comparison ? "1.5" : "2"}
            strokeDasharray={comparison ? "3 2" : ""}
            points={getPoints(trajectory)} 
            className="animate-draw"
          />
          
          {comparison && (
             <polyline 
               fill="none" 
               stroke="#10b981" 
               strokeWidth="2" 
               points={getPoints(comparison)} 
               className="animate-draw"
             />
          )}

          {trajectory.map((pt, i) => {
             const x = ((pt.age - minAge) / ageRange) * (width - 2 * padding) + padding;
             const y = height - ((pt.weight - minWeight) / weightRange * (height - 2 * padding) + padding);
             return (
               <g key={i}>
                 <circle cx={x} cy={y} r="1.5" fill={comparison ? "#94a3b8" : "#6366f1"} />
                 {(i === 0 || i === trajectory.length - 1) && !comparison && (
                   <text x={x} y={y - 4} fontSize="3" textAnchor="middle" fill="#4338ca" fontWeight="bold">{pt.weight}kg</text>
                 )}
               </g>
             );
          })}
        </svg>
      </div>
    </div>
  );
}

// 3. Risk Card with "Ask AI"
const RiskCardComponent: React.FC<{ 
  card: RiskCard; 
  isActive: boolean;
  userProfile: UserProfile; 
}> = ({ card, isActive, userProfile }) => {
  const [showChat, setShowChat] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  const handleAskAI = async () => {
    setShowChat(true);
    if (!chatResponse) {
      setLoadingChat(true);
      const question = `Why is ${card.organ} at ${card.probability}% risk of ${card.title}?`;
      const response = await explainHealthInsight(userProfile, card.summary, question);
      setChatResponse(response);
      setLoadingChat(false);
    }
  };

  const isHighRisk = card.probability > 40;
  const isMediumRisk = card.probability > 20 && card.probability <= 40;
  const theme = isHighRisk ? 'border-red-200 bg-red-50/80' : isMediumRisk ? 'border-orange-200 bg-orange-50/80' : 'border-emerald-200 bg-emerald-50/80';
  const barColor = isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-orange-500' : 'bg-emerald-500';
  const textColor = isHighRisk ? 'text-red-700' : isMediumRisk ? 'text-orange-700' : 'text-emerald-700';

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border transition-all duration-500 h-full flex flex-col relative overflow-hidden ${theme} ${isActive ? 'scale-100 opacity-100 ring-4 ring-white/50' : 'scale-95 opacity-60 grayscale-[0.5]'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor} mb-1 block`}>{card.organ}</span>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase leading-none tracking-tight">{card.title}</h3>
        </div>
        <div className="text-right pl-3">
          <div className={`text-3xl md:text-4xl font-black ${textColor} leading-none`}>{card.probability}%</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Probability</div>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden mb-5">
        <div className={`h-full ${barColor} relative overflow-hidden`} style={{ width: `${card.probability}%` }} />
      </div>

      <div className="mb-5 relative pl-3 border-l-2 border-slate-300">
        <p className="text-lg font-semibold text-slate-700 leading-tight italic">"{card.summary}"</p>
      </div>

      {/* Ask AI Section */}
      <div className="mt-auto pt-4 border-t border-slate-200/50">
        {!showChat ? (
          <button onClick={handleAskAI} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
            <MessageCircle size={12} /> Ask AI: Why this prediction?
          </button>
        ) : (
          <div className="bg-white/80 rounded-lg p-3 text-sm text-slate-700 shadow-inner border border-indigo-100 animate-fade-in-up">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold text-indigo-500 uppercase">AI Explanation</span>
                <button onClick={() => setShowChat(false)}><X size={12} className="text-slate-400" /></button>
             </div>
             {loadingChat ? (
               <div className="flex items-center gap-2 text-slate-400"><RefreshCw size={12} className="animate-spin" /> Analyzing models...</div>
             ) : (
               <p className="leading-relaxed">{chatResponse}</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Dashboard ---
const Dashboard: React.FC<DashboardProps> = ({ data, userProfile, onReset }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expandedChart, setExpandedChart] = useState<'health' | 'weight' | null>(null);
  
  // Scenario & Simulation State
  const [activeScenarios, setActiveScenarios] = useState<Record<string, Partial<UserProfile>>>({});
  const [selectedScenarioId, setSelectedScenarioId] = useState<"status_quo" | "small_changes" | "big_changes">("status_quo");

  const activeData = simulationData || data;
  const currentOrgan = activeData.riskCards[currentCardIndex]?.organ || 'Whole Body';

  const toggleSimulation = async (scenarioName: string, modifications: Partial<UserProfile>) => {
    setIsSimulating(true);
    // Explicitly create a new object from the record to avoid spread type errors
    const newScenarios: Record<string, Partial<UserProfile>> = { ...activeScenarios };
    
    // Toggle logic
    if (newScenarios[scenarioName]) {
      delete newScenarios[scenarioName];
    } else {
      newScenarios[scenarioName] = modifications;
    }
    
    setActiveScenarios(newScenarios);

    // Combine all active modifications
    const combinedModifications = Object.values(newScenarios).reduce(
      (acc, curr) => ({ ...acc, ...curr }), 
      {} as Partial<UserProfile>
    );
    
    // If no scenarios active, reset
    if (Object.keys(newScenarios).length === 0) {
      setSimulationData(null);
      setIsSimulating(false);
      return;
    }

    const newProfile = { ...userProfile, ...combinedModifications };
    try {
      const result = await generateHealthProjection(newProfile as UserProfile);
      setSimulationData(result);
      setCurrentCardIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const lifeExpectancyDelta = simulationData ? simulationData.lifeExpectancy - data.lifeExpectancy : 0;
  const activeLabels = Object.keys(activeScenarios).join(" + ");

  // Prepare scenario data for charts
  const selectedScenario = activeData.scenarios?.items?.find(i => i.id === selectedScenarioId);
  
  // If we have a selected scenario, map its trajectories for chart comparison
  const scenarioHealthTrajectory = selectedScenario?.projected?.healthScoreTrajectory?.map(p => ({
    age: p.age, score: p.value
  })) || null;
  
  const scenarioWeightTrajectory = selectedScenario?.projected?.weightTrajectory?.map(p => ({
    age: p.age, weight: p.value
  })) || null;

  // If manual simulation is active, that takes precedence over the selected scenario view in charts
  const displayHealthSimulated = simulationData ? simulationData.trajectory : (selectedScenarioId !== 'status_quo' ? scenarioHealthTrajectory : null);
  const displayWeightComparison = simulationData ? simulationData.weightTrajectory : (selectedScenarioId !== 'status_quo' ? scenarioWeightTrajectory : null);
  const displayLabel = simulationData ? (activeLabels || 'Modified') : (selectedScenario?.label || 'Projected');

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50">
      
      {/* Expanded Chart Overlay */}
      {expandedChart && (
        <ExpandedChartOverlay 
          type={expandedChart}
          data={expandedChart === 'health' ? data.trajectory : activeData.weightTrajectory}
          simulatedData={expandedChart === 'health' ? (simulationData?.trajectory || scenarioHealthTrajectory || undefined) : undefined}
          dataKey={expandedChart === 'health' ? 'score' : 'weight'}
          label={displayLabel}
          userProfile={userProfile}
          onClose={() => setExpandedChart(null)}
        />
      )}

      {/* Left Panel */}
      <div className="w-full lg:w-[60%] flex flex-col h-full border-r border-slate-200 relative bg-slate-50/50">
        <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm z-20 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-teal-600" size={20} />
              Future Health Projection
            </h1>
          </div>
          <button onClick={onReset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"><RefreshCw size={18} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6 fade-in pb-8">
             
             {/* 1. Score Cards */}
            <div className="flex flex-row gap-3">
               <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                 <div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">Current Health Score</div>
                   <div className="text-xs text-slate-500">Biological Vitality</div>
                 </div>
                 <div className="flex items-baseline gap-0.5">
                   <div className="text-3xl font-black text-slate-800">{activeData.healthScoreCurrent}</div>
                   <div className="text-xs text-slate-400 font-bold">/100</div>
                 </div>
               </div>
               
               <div className={`flex-1 p-4 rounded-2xl border shadow-lg text-white relative overflow-hidden flex items-center justify-between transition-all duration-500 ${simulationData ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500' : 'bg-gradient-to-br from-teal-600 to-teal-700 border-teal-500'}`}>
                 <div className="relative z-10">
                   <div className="text-[10px] text-teal-100 font-bold uppercase tracking-wider mb-0.5">10-Year Outlook</div>
                   <div className="text-xs text-teal-200">{displayLabel}</div>
                 </div>
                 <div className="flex items-baseline gap-0.5 relative z-10">
                   <div className="text-3xl font-black">{activeData.healthScoreFuture}</div>
                   <div className="text-xs text-teal-200 font-bold">/100</div>
                 </div>
               </div>
            </div>

            {/* 2. Detailed Metrics Panel (New) */}
            <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Scale size={10}/> BMI</span>
                  <span className="text-xl font-bold text-slate-800">{calculateBMI(userProfile.heightCm, userProfile.weightKg)}</span>
               </div>
               <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Flame size={10}/> BMR</span>
                  <span className="text-xl font-bold text-slate-800">{calculateBMR(userProfile)} <span className="text-[9px]">kcal</span></span>
               </div>
               <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Ruler size={10}/> Waist</span>
                  <span className="text-xl font-bold text-slate-800">{userProfile.waistCm} <span className="text-[9px]">cm</span></span>
               </div>
               <div className="flex flex-col items-center p-2 bg-white rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Activity size={10}/> WHR</span>
                  <span className="text-xl font-bold text-slate-800">{calculateWHR(userProfile.waistCm, userProfile.hipCm)}</span>
               </div>
            </div>

            {/* 3. Scenario & Simulation Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
               
               {/* Scenario Tabs */}
               {activeData.scenarios?.items && (
                 <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch size={14} className="text-teal-600" />
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compare Future Scenarios</h2>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(['status_quo', 'small_changes', 'big_changes'] as const).map((id) => (
                        <button
                          key={id}
                          onClick={() => setSelectedScenarioId(id)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            selectedScenarioId === id 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {id === 'status_quo' ? 'Status Quo' : id === 'small_changes' ? 'Small Changes' : 'Big Changes'}
                        </button>
                      ))}
                    </div>

                    {/* Scenario Details */}
                    {selectedScenario && selectedScenarioId !== 'status_quo' && (
                       <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4 animate-fade-in">
                          <div className="flex items-start justify-between mb-3">
                             <div className="text-sm font-bold text-slate-800">{selectedScenario.label}</div>
                             <div className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-semibold">
                               Confidence: <span className="uppercase">{selectedScenario.uncertainty?.level || 'Medium'}</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Key Drivers</h5>
                                <ul className="space-y-1">
                                   {selectedScenario.topDrivers?.slice(0, 3).map((driver, idx) => (
                                     <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                                       <ArrowRight size={10} className={driver.direction === 'improves' ? 'text-emerald-500' : 'text-amber-500'} />
                                       {driver.label}
                                     </li>
                                   ))}
                                </ul>
                             </div>
                             <div>
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Modified Inputs</h5>
                                <div className="flex flex-wrap gap-1.5">
                                   {selectedScenario.modifiedInputs?.map((input, idx) => (
                                      <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                                         {input.field}: {input.to}
                                      </span>
                                   ))}
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               )}

               <div className="h-px bg-slate-100 w-full mb-6" />

               {/* Manual Compound Toggles */}
               <div className="flex items-center gap-2 mb-3">
                 <Zap size={14} className="text-amber-500" />
                 <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manual Simulations</h2>
               </div>
               <div className="flex flex-wrap gap-2 mb-4">
                 {userProfile.smoker && (
                   <button 
                    onClick={() => toggleSimulation('Quit Smoking', { smoker: false, cigarettesPerDay: 0 })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${activeScenarios['Quit Smoking'] ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                   >
                     <CigaretteOff size={14} /> Quit Smoking
                   </button>
                 )}
                 
                 <button 
                  onClick={() => toggleSimulation('Exercise', { activityLevel: ActivityLevel.Active })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${activeScenarios['Exercise'] ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                 >
                   <Dumbbell size={14} /> Daily Exercise
                 </button>

                 <button 
                  onClick={() => toggleSimulation('Diet', { fastFoodFrequency: FastFoodFrequency.Never, dietQuality: DietQuality.Good })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${activeScenarios['Diet'] ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                 >
                   <UtensilsCrossed size={14} /> Clean Diet
                 </button>
               </div>
               
               {isSimulating && (
                  <div className="p-4 flex items-center justify-center text-teal-600 text-xs font-bold animate-pulse">
                     <RefreshCw className="animate-spin mr-2" size={14}/> Recalculating compound trajectory...
                  </div>
               )}

               {/* Impact Analysis */}
               {simulationData && !isSimulating && (
                 <div className="mt-4 mb-6 bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 animate-fade-in-up">
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                       <TrendingUp size={14} /> Compound Impact
                    </h3>
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200">
                         <div className="text-[10px] font-bold text-slate-400 uppercase">Estimated Life Expectancy</div>
                         <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-slate-800">{simulationData.lifeExpectancy}</span>
                            <span className="text-sm font-bold text-emerald-600 mb-1.5 flex items-center">+{lifeExpectancyDelta} Years</span>
                         </div>
                    </div>
                 </div>
               )}

               {/* 4. Charts Area */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(data.trajectory && data.trajectory.length > 0) && (
                    <ComparisonChart 
                      original={data.trajectory} 
                      simulated={displayHealthSimulated} 
                      label={displayLabel} 
                      onExpand={() => setExpandedChart('health')}
                    />
                  )}
                  {(data.weightTrajectory && data.weightTrajectory.length > 0) && (
                    <WeightChart 
                      trajectory={activeData.weightTrajectory} 
                      comparison={displayWeightComparison}
                      label="Weight" 
                      onExpand={() => setExpandedChart('weight')}
                    />
                  )}
               </div>

               {/* NEW: Chart Specs & Targets */}
               {activeData.chartSpecs && activeData.chartSpecs.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                       <Target size={14} className="text-indigo-500" />
                       <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insights & Targets</h2>
                    </div>
                    
                    {/* Bullet Targets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       {activeData.chartSpecs.filter(s => s.type === 'bullet_target').map((spec, i) => (
                          <BulletTargetCard key={i} spec={spec} />
                       ))}
                    </div>

                    {/* Stacked Contributions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       {activeData.chartSpecs.filter(s => s.type === 'stacked_contribution_bar').map((spec, i) => (
                          <StackedContributionCard key={i} spec={spec} />
                       ))}
                    </div>

                    {/* Timeline Milestones (Filtered by Selected Scenario if possible) */}
                    <div className="space-y-4">
                       {activeData.chartSpecs
                         .filter(s => s.type === 'timeline_milestones')
                         .filter(s => {
                           // Try to match timeline to selected scenario
                           // Fallback to showing all if id matching isn't explicit
                           if (s.id && s.id.includes(selectedScenarioId)) return true;
                           // If chart spec ID is generic or we just want to show timelines for current context
                           return s.id === selectedScenarioId; 
                         })
                         .map((spec, i) => (
                           <MilestoneTimelineCard key={i} spec={spec} />
                       ))}
                       {/* Fallback: if no specific timeline matched the ID, maybe show a generic one or none */}
                       {activeData.chartSpecs.filter(s => s.type === 'timeline_milestones' && !s.id.includes('status_quo') && !s.id.includes('small_changes') && !s.id.includes('big_changes')).length > 0 && 
                          activeData.chartSpecs.filter(s => s.type === 'timeline_milestones' && !s.id.includes('status_quo') && !s.id.includes('small_changes') && !s.id.includes('big_changes')).map((spec, i) => (
                             <MilestoneTimelineCard key={`gen-${i}`} spec={spec} />
                          ))
                       }
                    </div>
                 </div>
               )}

            </div>

            {/* 5. Risk Cards Carousel */}
            <div className="h-px bg-slate-200 w-full my-4"></div>
            <div className="relative group">
              <div className="flex items-center justify-between mb-2 px-1">
                 <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detailed Risk Analysis</h2>
                 <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                   {currentCardIndex + 1} of {activeData.riskCards.length}
                 </div>
              </div>
              <div className="overflow-hidden py-4 -my-4 px-1"> 
                <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentCardIndex * 87}%)` }}>
                  {activeData.riskCards.map((card, idx) => (
                    <div key={idx} className="w-[85%] shrink-0 mr-[2%] transition-all duration-500">
                      <RiskCardComponent card={card} isActive={idx === currentCardIndex} userProfile={userProfile} />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => currentCardIndex > 0 && setCurrentCardIndex(p => p - 1)} disabled={currentCardIndex === 0} className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-600 hover:text-teal-600 transition-all ${currentCardIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronLeft size={20} /></button>
              <button onClick={() => currentCardIndex < activeData.riskCards.length - 1 && setCurrentCardIndex(p => p + 1)} disabled={currentCardIndex === activeData.riskCards.length - 1} className={`absolute right-4 top-1/2 -translate-y-1/2 translate-x-0 w-12 h-12 bg-slate-900 border border-slate-700 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-slate-800 transition-all active:scale-95 ${currentCardIndex === activeData.riskCards.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><ChevronRight size={24} /></button>
            </div>

            {/* Medical Disclaimer */}
            <div className="bg-slate-100 p-4 rounded-xl text-[10px] text-slate-500 leading-relaxed border border-slate-200 mt-8">
               <p className="font-bold mb-1">MEDICAL DISCLAIMER</p>
               <p>This is not a medical diagnosis. These predictions are based on statistical projections from open data (e.g., CDC, UK Biobank) using AI and do not substitute for professional medical advice.</p>
            </div>

          </div>
        </div>
      </div>

      {/* Right Panel: 3D Model */}
      <div className="w-full lg:w-[40%] h-[35vh] lg:h-full bg-slate-900 relative border-t lg:border-t-0 lg:border-l border-slate-200 shadow-2xl overflow-hidden">
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
           <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg text-[10px] font-semibold text-white/90 flex items-center gap-1.5">
              <Activity size={12} className="text-teal-400"/> Interactive 3D Model
           </div>
           <div className={`transition-all duration-500 transform ${currentOrgan ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-xl max-w-[200px]">
                <div className="text-[9px] text-teal-200 uppercase font-bold mb-1 flex items-center gap-1"><Search size={10} /> Active Focus</div>
                <div className="text-lg font-bold text-white capitalize">{currentOrgan}</div>
              </div>
           </div>
        </div>
        <iframe src="https://www.zygotebody.com" className="w-full h-full border-0 opacity-80 hover:opacity-100 transition-opacity duration-700" title="Zygote Body" allow="autoplay; encrypted-media" />
      </div>
    </div>
  );
};

export default Dashboard;