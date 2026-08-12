import React, { useState } from 'react';
import { 
  FolderLock, 
  Upload, 
  FileText, 
  Search, 
  Tag, 
  Calendar, 
  UserCheck, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentsTabProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  onAddDocument
}) => {
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const documentTypes = ['Todos', 'Receita', 'Atestado', 'Laudo', 'Comprovante'];

  const filteredDocs = documents.filter(doc => 
    selectedType === 'Todos' || doc.type === selectedType
  );

  const handleSimulateUpload = async () => {
    setIsAnalyzing(true);
    setTimeout(async () => {
      try {
        const response = await fetch('/api/gemini/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText: 'Atestado de Aptidão Física e Licença Esportiva assinado por Dra. Patricia Lima em 10/03/2026.'
          })
        });

        const data = await response.json();
        const extracted = data.result || {};

        const newDoc: DocumentItem = {
          id: `doc-${Date.now()}`,
          title: extracted.title || 'Atestado de Aptidão Física Esportiva',
          type: 'Atestado',
          uploadDate: new Date().toISOString().split('T')[0],
          doctorName: extracted.doctorName || 'Dra. Patricia Lima',
          fileSize: '1.4 MB',
          notes: extracted.summary || 'Liberado para atividades físicas de alto rendimento.',
          tags: ['Atestado', 'Cardiologia', 'Analisado por IA']
        };

        onAddDocument(newDoc);
      } catch (err) {
        console.error("Erro ao analisar documento:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <FolderLock className="w-4 h-4" />
            <span>Cofre Criptografado</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Cofre de Documentos Médicos</h1>
          <p className="text-xs text-slate-300 mt-1">
            Armazene e organize receitas médicas, atestados, laudos e cartões de vacina em um repositório seguro e criptografado.
          </p>
        </div>

        <button
          onClick={handleSimulateUpload}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shrink-0 transition-all"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando com IA...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>+ Enviar Documento</span>
            </>
          )}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {documentTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedType === type
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div key={doc.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {doc.type}
                </span>
                <h3 className="text-sm font-bold text-white mt-1 leading-snug">{doc.title}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {doc.notes}
            </p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {doc.uploadDate}</span>
              <span>{doc.fileSize}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
