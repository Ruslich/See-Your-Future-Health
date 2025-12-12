import React from 'react';
import { ChartSpec } from '../types';
import { PieChart, AlertCircle } from 'lucide-react';

interface StackedContributionCardProps {
  spec: ChartSpec;
}

const StackedContributionCard: React.FC<StackedContributionCardProps> = ({ spec }) => {
  const rawData = Array.isArray(spec.data) ? spec.data : [];
  
  if (rawData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-center h-full min-h-[150px]">
         <div className="text-center text-slate-400">
           <AlertCircle className="mx-auto mb-2 opacity-50" />
           <p className="text-xs font-bold uppercase">No breakdown data available</p>
         </div>
      </div>
    );
  }

  // Normalize data
  const totalValue = rawData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
  const data = rawData.map((d: any, i: number) => ({
    ...d,
    percent: totalValue > 0 ? ((d.value || 0) / totalValue) * 100 : 0,
    color: d.color || [
      'bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-500', 'bg-blue-400', 'bg-emerald-400'
    ][i % 7]
  }));

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{spec.title}</h4>
      {spec.subtitle && <p className="text-[10px] text-slate-400 font-medium mb-4">{spec.subtitle}</p>}
      
      {/* Stacked Bar */}
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-4">
        {data.map((item: any, idx: number) => (
          <div 
            key={idx}
            className={`h-full ${item.color} relative group transition-all duration-500`}
            style={{ width: `${item.percent}%` }}
          >
             {/* Tooltip on hover */}
             <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
               {item.label}: {item.value}
             </div>
          </div>
        ))}
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
         {data.map((item: any, idx: number) => (
           <div key={idx} className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
             <div className="flex justify-between w-full">
                <span className="text-[10px] font-medium text-slate-600 truncate mr-2" title={item.label}>{item.label}</span>
                <span className="text-[10px] font-bold text-slate-400">{Math.round(item.percent)}%</span>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default StackedContributionCard;