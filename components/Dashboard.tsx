import React from 'react';
import { SimulationResponse, UserProfile } from '../types';
import { RefreshCw, Activity, Heart, BookOpen } from 'lucide-react';

interface DashboardProps {
  data: SimulationResponse;
  userProfile: UserProfile;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  
  // Custom parser for the "Powerful Statement" style
  const renderContent = (text: string) => {
    if (!text) return null;
    
    return text.split('\n').map((line, i) => {
      // 1. Handle Organ Highlights [highlight:organ]
      let processedLine = line.replace(/\[highlight:([a-z]+)\]/g, (match, organ) => {
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wide border border-teal-200 ml-2 shadow-sm">${organ}</span>`;
      });

      // 2. Handle Sources (Source: ...) - Style them as citations
      processedLine = processedLine.replace(/\(Source: (.*?)\)/g, '<span class="citation-tag" title="Research Source">$1</span>');

      const trimmed = line.trim();

      // 3. Handle "Powerful Statements" (Lines starting with **TEXT**)
      // We treat these as subheaders now.
      if (trimmed.startsWith('**') && trimmed.length < 100) {
        // Remove the ** markers
        const content = trimmed.replace(/\*\*/g, '');
        return <h3 key={i} className="text-lg font-extrabold text-slate-800 mt-6 mb-2 uppercase tracking-tight flex items-center" dangerouslySetInnerHTML={{ __html: content }} />;
      }
      
      // 4. Handle Bold text inside paragraphs
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-slate-900">$1</span>');

      // 5. Lists
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return <li key={i} className="ml-4 mb-2 text-slate-700 leading-relaxed list-disc marker:text-teal-500 pl-2" dangerouslySetInnerHTML={{ __html: processedLine.replace(/^[\*\-]\s/, '') }} />;
      }

      // 6. Empty lines
      if (trimmed === '') {
        return <div key={i} className="h-3" />;
      }

      // 7. Regular paragraphs
      return <p key={i} className="mb-2 text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-slate-50">
      {/* Left Panel: Report */}
      <div className="w-full lg:w-1/2 flex flex-col h-full border-r border-slate-200">
        <div className="p-6 bg-white border-b border-slate-100 shadow-sm z-10 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-teal-600" size={24} />
              Future Health Projection
            </h1>
            <p className="text-xs text-slate-500 font-medium">POWERED BY POPULATION HEALTH DATA</p>
          </div>
          <button 
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
            title="Start Over"
          >
            <RefreshCw size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
          <div className="max-w-2xl mx-auto fade-in pb-10">
             {/* Score Card */}
            <div className="flex gap-4 mb-8">
               <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={40} />
                 </div>
                 <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Current Health</div>
                 <div className="text-4xl font-black text-slate-800">{data.healthScoreCurrent}</div>
                 <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden">
                    <div className="bg-slate-800 h-full transition-all duration-1000" style={{ width: `${data.healthScoreCurrent}%` }}></div>
                 </div>
               </div>
               <div className="flex-1 bg-teal-600 p-5 rounded-2xl border border-teal-500 shadow-lg text-white relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                 <div className="text-xs text-teal-100 font-bold uppercase tracking-wider mb-2">Projected (10y)</div>
                 <div className="text-4xl font-black">{data.healthScoreFuture}</div>
                 <div className="w-full bg-teal-800/50 h-2 mt-4 rounded-full overflow-hidden">
                    <div className="bg-white h-full transition-all duration-1000" style={{ width: `${data.healthScoreFuture}%` }}></div>
                 </div>
               </div>
            </div>

            {/* Markdown Content */}
            <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-headings:font-bold prose-headings:text-slate-900">
              {renderContent(data.markdownReport)}
            </div>

            {/* Action Item */}
            <div className="mt-10 bg-indigo-900 text-white p-6 rounded-xl flex gap-5 items-center shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
               <div className="p-3 bg-white/10 rounded-lg shrink-0 backdrop-blur-sm border border-white/10">
                  <Heart size={24} className="text-indigo-200" />
               </div>
               <div className="relative z-10">
                  <h4 className="font-bold text-indigo-200 text-xs uppercase tracking-widest mb-1">High Impact Intervention</h4>
                  <p className="text-lg font-medium leading-tight">{data.suggestedAction}</p>
               </div>
            </div>
            
            <div className="mt-8 flex items-start gap-2 text-[10px] text-slate-400 bg-slate-100 p-3 rounded-lg">
              <BookOpen size={14} className="shrink-0 mt-0.5" />
              <p>
                This simulation uses generative AI grounded in public health data (CDC, WHO, NIH). 
                Citations are provided for educational purposes. 
                Individual health outcomes vary significantly. 
                Always consult a healthcare professional.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: 3D Visualization */}
      <div className="w-full lg:w-1/2 h-[40vh] lg:h-full bg-slate-900 relative border-t lg:border-t-0 lg:border-l border-slate-200">
        <div className="absolute top-6 left-6 z-10 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg text-xs font-semibold text-white/80">
           Interactive 3D Model
        </div>
        <iframe 
          src="https://www.zygotebody.com" 
          className="w-full h-full border-0 opacity-90"
          title="Zygote Body"
          allow="autoplay; encrypted-media"
        />
        {/* Organ Overlays - Simulated Highlights */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none px-4">
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {data.organHighlights.map(organ => (
              <div key={organ} className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xl backdrop-blur animate-pulse border border-red-400/50 flex items-center gap-2">
                 <Activity size={14} />
                 RISK: {organ.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
