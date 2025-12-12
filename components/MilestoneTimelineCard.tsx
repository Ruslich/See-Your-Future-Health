import React from 'react';
import { ChartSpec } from '../types';
import { Flag, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface MilestoneTimelineCardProps {
  spec: ChartSpec;
}

const MilestoneTimelineCard: React.FC<MilestoneTimelineCardProps> = ({ spec }) => {
  const milestones = Array.isArray(spec.data) ? spec.data : [];

  if (milestones.length === 0) return null;

  // Sort by age just in case
  const sorted = [...milestones].sort((a: any, b: any) => a.age - b.age);

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Flag size={16} className="text-teal-600" />
        <div>
           <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{spec.title}</h4>
           {spec.subtitle && <p className="text-[10px] text-slate-400">{spec.subtitle}</p>}
        </div>
      </div>

      <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
        {sorted.map((m: any, idx: number) => {
           let icon = <CheckCircle2 size={14} className="text-emerald-500" />;
           let bg = "bg-emerald-50 border-emerald-100";
           
           if (m.type === 'risk_increased' || m.type === 'threshold_crossed') {
              icon = <AlertTriangle size={14} className="text-amber-500" />;
              bg = "bg-amber-50 border-amber-100";
           }
           
           return (
             <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-slate-300 z-10" />
                
                <div className={`p-3 rounded-lg border ${bg} transition-all hover:shadow-md`}>
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white/50 px-2 py-0.5 rounded-full border border-white/50">
                        Age {m.age}
                      </span>
                      {icon}
                   </div>
                   <h5 className="text-sm font-bold text-slate-800 mb-0.5 leading-tight">{m.title}</h5>
                   <p className="text-xs text-slate-600 leading-relaxed opacity-90">{m.detail}</p>
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default MilestoneTimelineCard;