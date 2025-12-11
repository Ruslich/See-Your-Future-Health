import React, { useState } from 'react';
import { UserProfile, Gender, ActivityLevel, DietQuality, FastFoodFrequency, STEPS } from '../types';
import { ArrowRight, ArrowLeft, CheckCircle2, Footprints, Armchair, Stethoscope, Utensils, Beer, Cigarette, Moon } from 'lucide-react';

interface StepFormProps {
  onComplete: (data: UserProfile) => void;
}

const INITIAL_DATA: UserProfile = {
  age: 30,
  gender: Gender.Male,
  heightCm: 175,
  weightKg: 75,
  waistCm: 80,
  hipCm: 95,
  
  dailySteps: 5000,
  sittingHours: 8,
  existingConditions: [],

  sleepHours: 7,
  activityLevel: ActivityLevel.Moderate,
  smoker: false,
  cigarettesPerDay: 0,
  alcoholDrinksPerWeek: 2,
  dietQuality: DietQuality.Average,
  fastFoodFrequency: FastFoodFrequency.Weekly
};

const COMMON_CONDITIONS = [
  "Hypertension",
  "Type 2 Diabetes",
  "High Cholesterol",
  "Asthma",
  "Heart Disease",
  "Arthritis",
  "Depression",
  "Migraines"
];

const StepForm: React.FC<StepFormProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<UserProfile>(INITIAL_DATA);

  const currentStep = STEPS[stepIndex];

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const updateField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCondition = (condition: string) => {
    setData(prev => {
      const exists = prev.existingConditions.includes(condition);
      if (exists) {
        return { ...prev, existingConditions: prev.existingConditions.filter(c => c !== condition) };
      } else {
        return { ...prev, existingConditions: [...prev.existingConditions, condition] };
      }
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6 fade-in pb-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Basic Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-500 mb-1 uppercase tracking-wide">Age</label>
                <input 
                  type="number" 
                  value={data.age || ''}
                  onChange={(e) => updateField('age', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full p-3 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-lg transition-all"
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Sex</label>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {Object.values(Gender).map((g) => (
                    <button
                      key={g}
                      onClick={() => updateField('gender', g)}
                      className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                        data.gender === g 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-lg scale-[1.02]' 
                          : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'body':
        return (
          <div className="space-y-6 fade-in pb-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Measurements</h2>
            <div className="space-y-6">
               <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Height</label>
                    <div className="flex items-center gap-2 bg-white/40 p-3 rounded-xl border border-white/40">
                      <input 
                        type="number" 
                        value={data.heightCm}
                        onChange={(e) => updateField('heightCm', parseInt(e.target.value))}
                        className="w-full bg-transparent outline-none font-bold text-teal-800 text-xl"
                      />
                      <span className="text-sm text-slate-500 font-medium">cm</span>
                    </div>
                 </div>
                 <div className="flex-1">
                    <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Weight</label>
                    <div className="flex items-center gap-2 bg-white/40 p-3 rounded-xl border border-white/40">
                      <input 
                        type="number" 
                        value={data.weightKg}
                        onChange={(e) => updateField('weightKg', parseInt(e.target.value))}
                        className="w-full bg-transparent outline-none font-bold text-teal-800 text-xl"
                      />
                      <span className="text-sm text-slate-500 font-medium">kg</span>
                    </div>
                 </div>
               </div>
               
               <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Waist</label>
                    <div className="flex items-center gap-2 bg-white/40 p-3 rounded-xl border border-white/40">
                      <input 
                        type="number" 
                        value={data.waistCm}
                        onChange={(e) => updateField('waistCm', parseInt(e.target.value))}
                        className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg"
                      />
                      <span className="text-sm text-slate-500 font-medium">cm</span>
                    </div>
                 </div>
                 <div className="flex-1">
                    <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Hip</label>
                    <div className="flex items-center gap-2 bg-white/40 p-3 rounded-xl border border-white/40">
                      <input 
                        type="number" 
                        value={data.hipCm}
                        onChange={(e) => updateField('hipCm', parseInt(e.target.value))}
                        className="w-full bg-transparent outline-none font-bold text-slate-700 text-lg"
                      />
                      <span className="text-sm text-slate-500 font-medium">cm</span>
                    </div>
                 </div>
               </div>

               <p className="text-xs text-slate-500 italic">Waist and hip measurements help calculate your Waist-to-Hip Ratio (WHR), a key indicator of metabolic health.</p>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="space-y-6 fade-in pb-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Movement & Lifestyle</h2>
            
            {/* Daily Steps */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Footprints size={16} className="text-teal-600" />
                 <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Daily Steps</label>
              </div>
              <div className="bg-white/40 p-4 rounded-xl border border-white/40">
                <input 
                    type="range" 
                    min="500" max="25000" step="500"
                    value={data.dailySteps}
                    onChange={(e) => updateField('dailySteps', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mb-2 mix-blend-multiply"
                />
                <div className="flex justify-between items-center">
                   <span className="text-xs text-slate-400 font-medium">Sedentary</span>
                   <div className="text-xl font-bold text-teal-800">{data.dailySteps.toLocaleString()}</div>
                   <span className="text-xs text-slate-400 font-medium">Athlete</span>
                </div>
              </div>
            </div>

            {/* Sitting Time */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Armchair size={16} className="text-indigo-500" />
                 <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Sitting Time (Hours/Day)</label>
              </div>
              <div className="bg-white/40 p-4 rounded-xl border border-white/40">
                <input 
                    type="range" 
                    min="0" max="16" step="0.5"
                    value={data.sittingHours}
                    onChange={(e) => updateField('sittingHours', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-2 mix-blend-multiply"
                />
                <div className="text-center font-bold text-slate-700 text-lg">{data.sittingHours} Hours</div>
              </div>
            </div>

            {/* General Intensity */}
            <div>
               <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Workout Intensity</label>
               <select 
                  value={data.activityLevel}
                  onChange={(e) => updateField('activityLevel', e.target.value as ActivityLevel)}
                  className="w-full p-3 bg-white/60 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
               >
                 {Object.values(ActivityLevel).map(level => (
                   <option key={level} value={level}>{level}</option>
                 ))}
               </select>
            </div>
          </div>
        );
      case 'habits':
        return (
          <div className="space-y-6 fade-in pb-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Daily Habits</h2>
             <div className="space-y-6">
               
               {/* Sleep */}
               <div>
                <div className="flex items-center gap-2 mb-2">
                  <Moon size={16} className="text-indigo-500" />
                  <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Average Sleep</label>
                </div>
                <div className="bg-white/40 p-4 rounded-xl border border-white/40 flex items-center gap-4">
                  <input 
                    type="range" 
                    min="3" max="12" step="0.5"
                    value={data.sleepHours}
                    onChange={(e) => updateField('sleepHours', parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mix-blend-multiply"
                  />
                  <div className="w-16 text-right font-bold text-teal-800 text-lg">{data.sleepHours}h</div>
                </div>
              </div>
              
              {/* Fast Food Question - NEW */}
              <div>
                 <div className="flex items-center gap-2 mb-2">
                   <Utensils size={16} className="text-amber-500" />
                   <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Fast Food Frequency</label>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {Object.values(FastFoodFrequency).map((freq) => (
                       <button
                         key={freq}
                         onClick={() => updateField('fastFoodFrequency', freq)}
                         className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            data.fastFoodFrequency === freq
                            ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm'
                            : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                         }`}
                       >
                         {freq}
                       </button>
                    ))}
                 </div>
              </div>

               {/* Smoking */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <div className="flex items-center gap-2 mb-2">
                       <Cigarette size={16} className="text-slate-500" />
                       <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Smoke?</label>
                    </div>
                    <div className="flex bg-white/40 rounded-xl p-1 border border-white/40">
                      <button 
                        onClick={() => updateField('smoker', false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!data.smoker ? 'bg-white shadow-sm text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        No
                      </button>
                      <button 
                        onClick={() => updateField('smoker', true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${data.smoker ? 'bg-white shadow-sm text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Yes
                      </button>
                    </div>
                 </div>
                 {data.smoker && (
                   <div className="fade-in">
                      <label className="block text-xs md:text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Cigs/Day</label>
                      <input 
                        type="number" 
                        value={data.cigarettesPerDay || ''}
                        onChange={(e) => updateField('cigarettesPerDay', parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 bg-white/60 border border-slate-200 rounded-xl outline-none font-bold text-center"
                      />
                   </div>
                 )}
               </div>

               {/* Alcohol */}
               <div>
                <div className="flex items-center gap-2 mb-2">
                   <Beer size={16} className="text-orange-400" />
                   <label className="block text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">Alcohol (Drinks/Week)</label>
                </div>
                <div className="bg-white/40 p-4 rounded-xl border border-white/40 flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" max="25" 
                    value={data.alcoholDrinksPerWeek}
                    onChange={(e) => updateField('alcoholDrinksPerWeek', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 mix-blend-multiply"
                  />
                  <div className="w-16 text-right font-bold text-teal-800 text-lg">{data.alcoholDrinksPerWeek}</div>
                </div>
              </div>
             </div>
          </div>
        );
      case 'medical':
        return (
          <div className="space-y-6 fade-in pb-2">
            <div className="flex items-center gap-2">
               <Stethoscope className="text-teal-600" size={24}/>
               <h2 className="text-xl md:text-2xl font-bold text-slate-800">Medical History</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Select any existing conditions to help our AI generate a more accurate trajectory.
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateField('existingConditions', [])}
                className={`p-3 rounded-xl border text-xs md:text-sm font-bold transition-all ${
                  data.existingConditions.length === 0
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                    : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                }`}
              >
                None / Healthy
              </button>
              {COMMON_CONDITIONS.map((condition) => {
                const isSelected = data.existingConditions.includes(condition);
                return (
                  <button
                    key={condition}
                    onClick={() => {
                       // If selecting a condition, ensure "None" is cleared (though effectively handled by logic, visually distinct)
                       if(data.existingConditions.length === 0) updateField('existingConditions', []);
                       toggleCondition(condition);
                    }}
                    className={`p-3 rounded-xl border text-xs md:text-sm font-bold transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' 
                        : 'bg-white/60 text-slate-500 border-slate-200 hover:bg-white'
                    }`}
                  >
                    {condition}
                    {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 'diet':
         return (
          <div className="space-y-6 fade-in pb-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Nutrition Quality</h2>
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide">How would you rate your diet?</label>
              <div className="space-y-3">
                  {Object.values(DietQuality).map((q) => (
                    <button
                      key={q}
                      onClick={() => updateField('dietQuality', q)}
                      className={`w-full p-4 rounded-xl border text-left text-sm font-bold transition-all flex items-center justify-between ${
                        data.dietQuality === q
                          ? 'bg-teal-600 text-white border-teal-600 shadow-lg scale-[1.02]' 
                          : 'bg-white/60 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <span>{q}</span>
                      {data.dietQuality === q && <CheckCircle2 size={18} />}
                    </button>
                  ))}
              </div>
            </div>
          </div>
         );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/50 relative overflow-hidden transition-all duration-500">
      <div className="mb-6 relative z-10">
        <div className="flex gap-1.5 mb-2">
           {STEPS.map((_, i) => (
             <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-500 ${i <= stepIndex ? 'bg-teal-500' : 'bg-slate-300/50'}`} />
           ))}
        </div>
        <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           Step {stepIndex + 1} of {STEPS.length}
        </div>
      </div>
      
      {/* Content Container - Height adjusts naturally */}
      <div className="relative z-10 mb-8">
        {renderStep()}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200/50 relative z-10">
        <button 
          onClick={handleBack}
          disabled={stepIndex === 0}
          className={`flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 rounded-lg font-bold text-sm transition-colors ${stepIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={handleNext}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          {stepIndex === STEPS.length - 1 ? 'Analyze Future' : 'Next'} 
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default StepForm;