import React, { useState } from 'react';
import { UserProfile, Gender, ActivityLevel, DietQuality, STEPS } from '../types';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface StepFormProps {
  onComplete: (data: UserProfile) => void;
}

const INITIAL_DATA: UserProfile = {
  age: 30,
  gender: Gender.Male,
  heightCm: 175,
  weightKg: 75,
  sleepHours: 7,
  activityLevel: ActivityLevel.Moderate,
  smoker: false,
  cigarettesPerDay: 0,
  alcoholDrinksPerWeek: 2,
  dietQuality: DietQuality.Average
};

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

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Let's start with the basics.</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Age</label>
                <input 
                  type="number" 
                  value={data.age || ''}
                  onChange={(e) => updateField('age', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-lg transition-shadow"
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Sex</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(Gender).map((g) => (
                    <button
                      key={g}
                      onClick={() => updateField('gender', g)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        data.gender === g 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-lg scale-[1.02]' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Body Measurements</h2>
            <div className="space-y-6">
               <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Height (cm)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="120" max="220" 
                    value={data.heightCm}
                    onChange={(e) => updateField('heightCm', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="w-16 text-right text-teal-700 font-semibold">{data.heightCm} cm</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Weight (kg)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="40" max="150" 
                    value={data.weightKg}
                    onChange={(e) => updateField('weightKg', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="w-16 text-right text-teal-700 font-semibold">{data.weightKg} kg</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'lifestyle_1':
        return (
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Daily Routine</h2>
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Average Sleep (hours)</label>
                <div className="flex justify-between text-xs text-slate-400 px-1 mb-2">
                  <span>3h</span><span>12h</span>
                </div>
                <input 
                  type="range" 
                  min="3" max="12" step="0.5"
                  value={data.sleepHours}
                  onChange={(e) => updateField('sleepHours', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="text-center text-3xl font-bold text-teal-700 mt-2">{data.sleepHours}h</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-3">Activity Level</label>
                 <div className="space-y-2">
                  {Object.values(ActivityLevel).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateField('activityLevel', level)}
                      className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all ${
                        data.activityLevel === level 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'lifestyle_2':
        return (
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Habits</h2>
             <div className="space-y-8">
               <div>
                  <label className="block text-sm font-medium text-slate-500 mb-3">Do you smoke?</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => updateField('smoker', false)}
                      className={`flex-1 p-3 rounded-xl border font-medium transition-all ${!data.smoker ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      No
                    </button>
                    <button 
                      onClick={() => updateField('smoker', true)}
                      className={`flex-1 p-3 rounded-xl border font-medium transition-all ${data.smoker ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      Yes
                    </button>
                  </div>
               </div>
               
               {data.smoker && (
                 <div className="fade-in bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-sm font-medium text-slate-500 mb-2">Cigarettes per day</label>
                    <input 
                      type="number" 
                      value={data.cigarettesPerDay || ''}
                      placeholder="e.g. 5"
                      onChange={(e) => updateField('cigarettesPerDay', parseInt(e.target.value) || 0)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                 </div>
               )}

               <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Alcohol (Drinks per week)</label>
                <div className="flex justify-between text-xs text-slate-400 px-1 mb-2">
                  <span>0</span><span>20+</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="20" 
                  value={data.alcoholDrinksPerWeek}
                  onChange={(e) => updateField('alcoholDrinksPerWeek', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                 <div className="text-center text-xl font-bold text-teal-700 mt-2">{data.alcoholDrinksPerWeek} drinks</div>
              </div>
             </div>
          </div>
        );
      case 'diet':
         return (
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800">Nutrition</h2>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-4">How would you rate your diet?</label>
              <div className="space-y-3">
                  {Object.values(DietQuality).map((q) => (
                    <button
                      key={q}
                      onClick={() => updateField('dietQuality', q)}
                      className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${
                        data.dietQuality === q
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
    <div className="w-full max-w-lg mx-auto bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl border border-white/50 relative overflow-hidden">
      <div className="mb-8 relative z-10">
        <div className="flex gap-2 mb-4">
           {STEPS.map((_, i) => (
             <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${i <= stepIndex ? 'bg-teal-500' : 'bg-slate-200'}`} />
           ))}
        </div>
      </div>
      
      <div className="min-h-[400px] relative z-10">
        {renderStep()}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-slate-100 relative z-10">
        <button 
          onClick={handleBack}
          disabled={stepIndex === 0}
          className={`flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 rounded-lg font-medium transition-colors ${stepIndex === 0 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button 
          onClick={handleNext}
          className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          {stepIndex === STEPS.length - 1 ? 'Analyze Future' : 'Next'} 
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default StepForm;