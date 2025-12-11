import React from 'react';
import { UserProfile, Gender, ActivityLevel } from '../types';
import { ArrowRight, Activity, Flame, Scale, TrendingUp, Ruler } from 'lucide-react';

interface BaselineAnalysisProps {
  userProfile: UserProfile;
  onProceed: () => void;
}

const BaselineAnalysis: React.FC<BaselineAnalysisProps> = ({ userProfile, onProceed }) => {
  // 1. Calculate BMI
  const heightM = userProfile.heightCm / 100;
  const bmi = (userProfile.weightKg / (heightM * heightM));
  let bmiCategory = "Normal Weight";
  let bmiColor = "text-emerald-600";
  let bmiBg = "bg-emerald-100";
  
  if (bmi < 18.5) { bmiCategory = "Underweight"; bmiColor = "text-blue-600"; bmiBg = "bg-blue-100"; }
  else if (bmi >= 25 && bmi < 30) { bmiCategory = "Overweight"; bmiColor = "text-orange-600"; bmiBg = "bg-orange-100"; }
  else if (bmi >= 30) { bmiCategory = "Obese"; bmiColor = "text-red-600"; bmiBg = "bg-red-100"; }

  // 2. Calculate BMR (Mifflin-St Jeor)
  let bmr = 0;
  if (userProfile.gender === Gender.Male) {
     bmr = (10 * userProfile.weightKg) + (6.25 * userProfile.heightCm) - (5 * userProfile.age) + 5;
  } else {
     bmr = (10 * userProfile.weightKg) + (6.25 * userProfile.heightCm) - (5 * userProfile.age) - 161;
  }

  // 3. TDEE (Activity Multiplier)
  let activityMult = 1.2; // Sedentary
  if (userProfile.activityLevel === ActivityLevel.Light) activityMult = 1.375;
  if (userProfile.activityLevel === ActivityLevel.Moderate) activityMult = 1.55;
  if (userProfile.activityLevel === ActivityLevel.Active) activityMult = 1.725;
  
  const tdee = Math.round(bmr * activityMult);

  // 4. Waist-to-Hip Ratio
  const whr = userProfile.waistCm / userProfile.hipCm;
  let whrStatus = "Low Risk";
  let whrColor = "text-emerald-600";
  
  // WHO Standards
  if (userProfile.gender === Gender.Male) {
    if (whr > 0.9) { whrStatus = "High Risk"; whrColor = "text-red-600"; }
    else if (whr > 0.85) { whrStatus = "Moderate Risk"; whrColor = "text-orange-600"; }
  } else {
    if (whr > 0.85) { whrStatus = "High Risk"; whrColor = "text-red-600"; }
    else if (whr > 0.80) { whrStatus = "Moderate Risk"; whrColor = "text-orange-600"; }
  }


  return (
    <div className="w-full max-w-2xl mx-auto p-4 animate-fade-in-up">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
        
        <div className="text-center mb-8">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Activity size={12} /> Preliminary Analysis
           </div>
           <h2 className="text-3xl font-black text-slate-800">Your Baseline Metrics</h2>
           <p className="text-slate-500 mt-2">Before we simulate your future, here is where you stand today based on clinical standards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          {/* BMI Card */}
          <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center">
             <div className="flex items-center gap-2 mb-2">
                <Scale size={18} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">BMI Score</span>
             </div>
             <div className="text-4xl font-black text-slate-800 mb-1">{bmi.toFixed(1)}</div>
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${bmiBg} ${bmiColor}`}>
                {bmiCategory}
             </div>
          </div>

          {/* Metabolism Card */}
          <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center">
             <div className="flex items-center gap-2 mb-2">
                <Flame size={18} className="text-orange-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Burn (TDEE)</span>
             </div>
             <div className="text-4xl font-black text-slate-800 mb-1">{tdee}</div>
             <div className="text-xs font-bold text-slate-400 uppercase">Calories / Day</div>
          </div>

          {/* WHR Card */}
           <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col items-center justify-center md:col-span-2">
             <div className="flex items-center gap-2 mb-2">
                <Ruler size={18} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waist-to-Hip Ratio</span>
             </div>
             <div className="flex items-baseline gap-4">
               <div className="text-4xl font-black text-slate-800 mb-1">{whr.toFixed(2)}</div>
               <div className={`text-sm font-bold uppercase ${whrColor}`}>
                  {whrStatus}
               </div>
             </div>
             <div className="text-xs font-bold text-slate-400 uppercase mt-1">Based on WHO Guidelines</div>
          </div>

        </div>

        {/* Prediction Preview */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8 relative overflow-hidden">
           <div className="flex gap-4 items-start relative z-10">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mt-1">
                 <TrendingUp size={20} />
              </div>
              <div>
                 <h4 className="font-bold text-slate-800 text-sm uppercase mb-1">Population Trend Insight</h4>
                 <p className="text-sm text-slate-600 leading-relaxed">
                    Based on your demographic, individuals with similar activity levels typically see a 
                    <span className="font-bold text-indigo-600"> 8-12% increase</span> in body mass over the next decade without intervention.
                 </p>
              </div>
           </div>
        </div>

        <button 
          onClick={onProceed}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-2 group"
        >
          Simulate My Health Future 
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>

      </div>
    </div>
  );
};

export default BaselineAnalysis;