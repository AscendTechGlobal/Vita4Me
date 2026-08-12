import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  QrCode, 
  Check, 
  Copy, 
  ShieldCheck, 
  FileText, 
  Printer 
} from 'lucide-react';
import { UserProfile, Exam, MedicalRecord, Medication, Allergy } from '../types';

interface ShareModalProps {
  userProfile: UserProfile;
  exams: Exam[];
  medicalRecords: MedicalRecord[];
  medications: Medication[];
  allergies: Allergy[];
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  userProfile,
  exams,
  medicalRecords,
  medications,
  allergies,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://healthai.app/share/patient-${userProfile.cpf.replace(/[^0-9]/g, '')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-6">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Compartilhar Histórico Digital</h2>
            <p className="text-xs text-slate-400">Acesso seguro com permissão temporária para seu médico</p>
          </div>
        </div>

        {/* QR Code Simulation */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
          <div className="w-40 h-40 mx-auto bg-white p-3 rounded-xl flex items-center justify-center shadow-inner">
            {/* Minimal SVG QR pattern placeholder */}
            <div className="w-full h-full bg-slate-900 rounded flex flex-col items-center justify-center p-2 text-[10px] font-mono text-emerald-400 border-2 border-dashed border-emerald-500">
              <QrCode className="w-16 h-16 text-white mb-1" />
              <span>SCAN DOCTOR</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-200">
            Apresente este QR Code para o médico escanear durante a consulta
          </p>
          <p className="text-[11px] text-slate-400">
            O profissional terá acesso visualizador seguro apenas a exames, receitas e histórico liberados.
          </p>
        </div>

        {/* Secure Link */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Link Protegido de Compartilhamento:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Print Summary */}
        <button
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Imprimir / Gerar PDF do Resumo para Levar à Consulta</span>
        </button>

      </div>
    </div>
  );
};
