import React from 'react';
import { ChartSpec } from '../types';
import { Target, HelpCircle, AlertCircle } from 'lucide-react';

interface BulletTargetCardProps {
  spec: ChartSpec;
}

const BulletTargetCard: React.FC<BulletTargetCardProps> = ({ spec }) => {
  const data = spec.data || {};
  
  // Defensive extraction
  const currentValue = data.currentValue ?? data.current ?? data.value ?? 0;
  const targetValue = data.targetValue ?? data.target ?? null;
  const minValue = data.min ?? 0;
  const maxValue = data.max ?? (Math.max(currentValue, targetValue || 0) * 1.2) ?? 100;
  const ranges = data.ranges || []; // Expected [{label, max, color?}]
  const unit = spec.axes?.x?.unit ?? spec.data?.unit ?? "";

  // Calculate percentages
  const rangeWidth = maxValue - minValue;
  const getPercent = (val: number) => Math.min(100, Math.max(0, ((val - minValue) / rangeWidth) * 100));

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{spec.title}</h4>
          {spec.subtitle && <p className="text-[10px] text-slate-400 font-medium">{spec.subtitle}</p>}
        </div>
        <div className="text-right">
           <div className="text-xl font-black text-slate-800 leading-none">
             {currentValue.toLocaleString()} <span className="text-xs font-bold text-slate-400">{unit}</span>
           </div>
        </div>
      </div>

      <div className="relative h-6 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
         {/* Background Ranges */}
         {ranges.map((range: any, idx: number) => {
             const prevMax = idx === 0 ? minValue : ranges[idx - 1].max;
             const width = getPercent(range.max) - getPercent(prevMax);
             // Default colors if not provided
             const colors = ["bg-red-100", "bg-orange-100", "bg-emerald-100", "bg-blue-100"];
             const color = range.color || colors[idx % colors.length];
             
             return (
               <div 
                 key={idx} 
                 className={`absolute h-full ${color} border-r border-white/50 last:border-0`}
                 style={{ left: `${getPercent(prevMax)}%`, width: `${width}%` }}
                 title={range.label}
               />
             );
         })}
         
         {/* Current Value Bar */}
         <div 
           className="absolute top-1/2 -translate-y-1/2 h-2 bg-slate-800 rounded-full z-10 transition-all duration-1000"
           style={{ left: '0%', width: `${getPercent(currentValue)}%` }}
         />
         
         {/* Target Marker */}
         {targetValue !== null && (
           <div 
             className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-20 flex flex-col items-center justify-center group"
             style={{ left: `${getPercent(targetValue)}%` }}
           >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
         )}
      </div>
      
      {/* Legend / Labels */}
      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mt-1">
         <span>{minValue}</span>
         {targetValue && <span className="text-indigo-600">Target: {targetValue.toLocaleString()}</span>}
         <span>{maxValue.toLocaleString()}</span>
      </div>

      {spec.description && (
        <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-1.5">
           <HelpCircle size={12} className="shrink-0 mt-0.5 text-slate-400"/>
           {spec.description}
        </div>
      )}
    </div>
  );
};

export default BulletTargetCard;