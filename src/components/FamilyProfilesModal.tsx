import React, { useState } from "react";
import { 
  X, 
  Users, 
  Check, 
  Heart, 
  Trash2, 
  ArrowLeft,
  Plus
} from "lucide-react";
import { FamilyMember } from "../types";
import { HealthOnboardingModal } from "./HealthOnboardingModal";
import { trackEvent } from "../lib/analytics";

interface FamilyProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  activeMemberId: string;
  onSelectMember: (id: string) => void;
  onAddMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
}

export const FamilyProfilesModal: React.FC<FamilyProfilesModalProps> = ({
  isOpen,
  onClose,
  members,
  activeMemberId,
  onSelectMember,
  onAddMember,
  onDeleteMember,
}) => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (!isOpen) return null;

  const handleOnboardingCompleted = (data: any) => {
    const newMember: FamilyMember = {
      id: "fam-" + Date.now(),
      user_id: "usr-default",
      name: data.name,
      relationship: "Filho(a)",
      date_of_birth: data.birthDate,
      gender: data.gender,
      blood_type: data.bloodType,
      height_cm: data.height,
      weight_kg: data.weight,
      smoking_status: data.smoking,
      alcohol_status: data.alcohol,
      activity_level: data.activity,
      chronic_conditions: data.chronicConditions,
      allergies: data.allergies,
      is_active: true,
      onboarding_completed: true,
      created_at: new Date().toISOString(),
    };

    onAddMember(newMember);
    trackEvent('family_member_created', { is_family_context: true });
    setShowOnboarding(false);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Voltar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Perfis Familiares</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Alterne entre prontuários ou faça a anamnese de novos dependentes.
                </p>
              </div>

              <button
                onClick={() => setShowOnboarding(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Familiar</span>
              </button>
            </div>

            {/* Members List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {members.map(member => {
                const isSelected = member.id === activeMemberId;
                return (
                  <div
                    key={member.id}
                    onClick={() => {
                      onSelectMember(member.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl font-bold text-xs ${
                        isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-slate-900 dark:text-white">{member.name}</strong>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 font-semibold border border-slate-200 dark:border-slate-700">
                            {member.relationship}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tipo: {member.blood_type || 'N/A'} {member.weight_kg ? `| ${member.weight_kg}kg` : ''} {member.allergies?.length > 0 && `| Alergias: ${member.allergies.join(', ')}`}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 rounded-full bg-emerald-600 text-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full Onboarding Form for New Family Member */}
      {showOnboarding && (
        <HealthOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          targetType="family"
          onSaveCompleted={handleOnboardingCompleted}
        />
      )}
    </>
  );
};
