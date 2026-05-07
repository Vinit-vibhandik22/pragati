import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info,
  ExternalLink,
  ClipboardList
} from 'lucide-react';

interface ExtractedData {
  surveyNumber: string;
  landArea: string;
  farmerName: string;
  documentTypesDetected: string[];
}

interface AiVerdictCardProps {
  verdict: 'Verified' | 'Rejected' | 'Manual_Review_Required';
  reason: string;
  extractedData: ExtractedData | null;
  failureReasons?: string[];
}

export function AiVerdictCard({ verdict, reason, extractedData, failureReasons = [] }: AiVerdictCardProps) {
  const getVerdictStyles = () => {
    switch (verdict) {
      case 'Verified':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: <CheckCircle2 className="text-green-500" size={24} />,
          label: 'Verified',
          labelMR: 'सत्यापित'
        };
      case 'Rejected':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: <XCircle className="text-red-500" size={24} />,
          label: 'Rejected',
          labelMR: 'नकारले'
        };
      case 'Manual_Review_Required':
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: <AlertCircle className="text-yellow-500" size={24} />,
          label: 'Manual Review Required',
          labelMR: 'मॅन्युअल पुनरावलोकन आवश्यक'
        };
    }
  };

  const styles = getVerdictStyles();

  return (
    <div className={`mt-6 rounded-2xl border-2 p-6 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {styles.icon}
          <div>
            <h3 className={`text-xl font-bold ${styles.text}`}>
              {styles.label} <span className="text-sm font-normal opacity-70">({styles.labelMR})</span>
            </h3>
          </div>
        </div>
        <div className="bg-white/50 px-3 py-1 rounded-full border border-current/20 text-[10px] font-bold uppercase tracking-wider opacity-60">
          AI Analysis Complete
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-6 leading-relaxed italic">
        "{reason}"
      </p>

      {failureReasons.length > 0 && verdict === 'Rejected' && (
        <div className="mb-6 bg-red-100/50 p-4 rounded-xl border border-red-200">
          <h4 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-2">
            <Info size={14} /> Failure Reasons (अस्वीकाराची कारणे)
          </h4>
          <ul className="space-y-1">
            {failureReasons.map((fr, i) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-red-400 flex-shrink-0" />
                {fr}
              </li>
            ))}
          </ul>
        </div>
      )}

      {extractedData && (
        <div className="bg-white/80 rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-tight flex items-center gap-2">
              <ClipboardList size={14} /> Extracted Fields (काढलेला डेटा)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
            <div className="p-4 space-y-4">
              <DataRow 
                label="Survey Number" 
                labelMR="गट/सर्वे क्रमांक" 
                value={extractedData.surveyNumber} 
              />
              <DataRow 
                label="Land Area (Ha)" 
                labelMR="क्षेत्र (हेक्टर)" 
                value={extractedData.landArea} 
              />
            </div>
            <div className="p-4 space-y-4">
              <DataRow 
                label="Farmer Name" 
                labelMR="शेतकऱ्याचे नाव" 
                value={extractedData.farmerName} 
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                  <span>Docs Detected</span>
                  <span>दस्तऐवज आढळले</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {extractedData.documentTypesDetected.map((doc, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-100">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors">
          <ExternalLink size={14} /> View Audit Logs
        </button>
      </div>
    </div>
  );
}

function DataRow({ label, labelMR, value }: { label: string; labelMR: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
        <span>{label}</span>
        <span>{labelMR}</span>
      </div>
      <div className="text-sm font-bold text-gray-800">{value || 'N/A'}</div>
    </div>
  );
}
