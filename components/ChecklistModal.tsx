import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, ChevronDown, ChevronUp, AlertCircle, Clock, Target, ListChecks, ShieldCheck, RefreshCw, Printer } from 'lucide-react';
import { ChecklistData, FinancialData, DebtMapItem, User } from '../types';
import { PrintHeader } from './Mentorship/Meeting1/PrintHeader';
import { PrintPortal } from './PrintPortal';
import { CostOfLiving } from './CostOfLiving';
import { authService } from '../services/authService';

interface ChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialProgress?: number[];
    initialData?: ChecklistData;
    onSave?: (progress: number[], data: ChecklistData) => Promise<void>;
    readOnly?: boolean;
    financialData?: FinancialData;
    debtMapItems?: DebtMapItem[];
    phase?: 'LOCKED' | 'PHASE_1' | 'PHASE_2';
    user: User;
    onCostOfLivingUpdate?: () => void;
}

interface SubItemConfig {
    id: number;
    text: string;
    conditionalInput?: {
        trigger: 'unchecked' | 'checked'; // When to show input
        label: string;
        placeholder?: string;
    };
    info?: { // Informational text on check
        trigger: 'checked';
        text: string;
    };
}

interface StepConfig {
    id: number;
    title: string;
    description: string;
    subItems?: SubItemConfig[];
}

const PHASE1_STEPS: StepConfig[] = [
    { id: 1, title: "Grupo no WhatsApp", description: "Acompanhamento individual, tirar dúvidas e envio de informações relevantes para o seu financeiro." },
    { id: 2, title: "Envio do acesso ao sistema Solum", description: "Gerenciamento de todas as informações financeiras registradas." },
    { id: 3, title: "Preenchimento do diagnóstico inicial", description: "Base para estruturação do plano de ataque." },
    {
        id: 4,
        title: "Sangria de Dívidas",
        description: "Estancar o sangramento para retornar o combate.",
        subItems: [
            {
                id: 1,
                text: "Estão em dia?",
                conditionalInput: {
                    trigger: 'unchecked',
                    label: "Quais não estão em dia?",
                    placeholder: "Liste as dívidas em atraso..."
                }
            },
            {
                id: 2,
                text: "As parcelas estão cabendo no orçamento sem dificuldade?",
                conditionalInput: {
                    trigger: 'unchecked',
                    label: "Plano de Ação Inicial",
                    placeholder: "É necessário diminuir o valor das parcelas inicialmente..."
                },
                info: {
                    trigger: 'checked',
                    text: "Ótimo! Manter o pagamento em dia é prioridade."
                }
            }
        ]
    },
    {
        id: 5,
        title: "Plano de Ataque",
        description: "Definir gastos necessários e prioridades.",
        subItems: [
            {
                id: 1,
                text: "Está sobrando?",
                info: { trigger: 'checked', text: "Informe o valor que está sobrando:" },
                conditionalInput: { trigger: 'checked', label: "Valor Sobrando", placeholder: "R$ 0,00" }
            },
            {
                id: 2,
                text: "Verificar quais categorias possuem os maiores valores.",
                conditionalInput: { trigger: 'checked', label: "Por que esses valores estão altos?", placeholder: "Explique o motivo..." }
            },
            {
                id: 3,
                text: "Quais gastos desnecessários podem ser diminuídos?",
                conditionalInput: { trigger: 'checked', label: "Quais gastos?", placeholder: "Esses gastos precisam ser evitados..." }
            }
        ]
    },
    {
        id: 6,
        title: "Ação no Objetivo",
        description: "Seguir o planejamento sem baixas e sem desistências.",
        subItems: [
            { id: 1, text: "Criar carteiras na Solum" },
            { id: 2, text: "Cadastrar as dívidas na Solum" },
            { id: 3, text: "Criar gastos e definir os limites na Solum" },
            { id: 4, text: "Deixar o orçamento com valor sobrando" }
        ]
    },
    {
        id: 7,
        title: "Blindagem",
        description: "Estrutura simples para manter a ordem e o progresso.",
        subItems: [
            {
                id: 1,
                text: "Centralizar banco principal",
                info: { trigger: 'checked', text: "Use 1 conta corrente central para criar relacionamento." }
            },
            {
                id: 2,
                text: "Uso de até 2 cartões",
                info: { trigger: 'checked', text: "Um à vista e outro a prazo, se necessário." }
            }
        ]
    },
    {
        id: 8,
        title: "Suprimentos",
        description: "Essas reservas serão o seu bote salva vidas, foque em cuidar seus gastos para liberar espaço para elas nas próximas reuniões",
        subItems: [
            {
                id: 1,
                text: "Reserva Quebra-Galho",
                info: { trigger: 'checked', text: "Para coisas simples do dia a dia." }
            },
            {
                id: 2,
                text: "Reserva Colchão de Segurança",
                info: { trigger: 'checked', text: "Meta: 3 a 6 meses do custo mensal (construção gradual)." }
            }
        ]
    },
    {
        id: 9,
        title: "Dúvidas",
        description: "Tirar dúvidas e esclarecer o caminho.",
        subItems: [
            {
                id: 1,
                text: "Dúvidas ou Observações",
                conditionalInput: { trigger: 'checked', label: "Descreva suas dúvidas:", placeholder: "Escreva aqui..." }
            }
        ]
    }
];

const PHASE2_STEPS: StepConfig[] = [
    {
        id: 11,
        title: "Negociação com Credores",
        description: "Fase ativa de contato e renegociação para redução de juros e parcelas.",
        subItems: [
            {
                id: 1,
                text: "Entrou em contato com todos os credores?",
                info: { trigger: 'checked', text: "Mantenha o registro de todos os protocolos." }
            },
            {
                id: 2,
                text: "Conseguiu reduzir juros ou parcelas?",
                conditionalInput: { trigger: 'checked', label: "Resumo das conquistas", placeholder: "Descreva o que foi negociado..." },
                info: { trigger: 'checked', text: "Parabéns! Cada redução conta." }
            }
        ]
    },
    {
        id: 12,
        title: "Reconciliação Financeira",
        description: "Rotina de acompanhamento para não perder o controle.",
        subItems: [
            { id: 1, text: "Revisão diária do extrato bancário" },
            { id: 2, text: "Ajuste de categorias na Solum conforme gastos reais" }
        ]
    },
    {
        id: 13,
        title: "Monitoramento de Tetos",
        description: "Acompanhamento rigoroso dos limites estabelecidos.",
        subItems: [
            {
                id: 1,
                text: "Você estourou algum teto este mês?",
                conditionalInput: { trigger: 'checked', label: "Quais categorias e por quê?", placeholder: "Ex: Alimentação estourou devido a imprevisto..." },
                info: { trigger: 'checked', text: "Identifique a causa raiz para evitar recorrência." }
            }
        ]
    },
    {
        id: 14,
        title: "Lista de Cortes e O que Evitar",
        description: "Refinamento contínuo para otimizar o orçamento.",
        subItems: [
            {
                id: 1,
                text: "Identificou novos cortes possíveis?",
                conditionalInput: { trigger: 'checked', label: "O que pode ser cortado?", placeholder: "Ex: Assinatura de streaming não utilizada..." }
            }
        ]
    }
];

export const ChecklistModal: React.FC<ChecklistModalProps> = ({
    isOpen,
    onClose,
    initialProgress = [],
    initialData = {},
    onSave,
    readOnly = true,
    financialData,
    debtMapItems = [],
    phase = 'PHASE_1',
    user,
    onCostOfLivingUpdate
}) => {
    // Tab state for Phase 2 users
    const [activeTab, setActiveTab] = useState<'phase1' | 'phase2'>('phase1');

    // Flattened progress for the main steps (backward compatibility + visual progress)
    const [completedSteps, setCompletedSteps] = useState<number[]>(initialProgress);
    // Detailed data for sub-items and inputs
    const [checklistData, setChecklistData] = useState<ChecklistData>(initialData);

    const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showCostOfLivingSummary, setShowCostOfLivingSummary] = useState(false);

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    const renderSubItemValuePrint = (stepId: number, subId: number, value: string) => {
        if (!value) return null;

        // Special Case: Debt Negotiations (Step 11, Sub-item 2)
        if (stepId === 11 && subId === 2) {
            try {
                const negotiations = JSON.parse(value);
                if (!Array.isArray(negotiations) || negotiations.length === 0) return null;

                return (
                    <div className="not-italic mt-2">
                        <strong className="block mb-2 text-[10px] uppercase border-b pb-1">Detalhamento das Negociações:</strong>
                        <div className="overflow-x-auto w-full">
                            <table className="w-full min-w-[600px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-300">
                                        <th className="py-1 pr-2 uppercase text-[8px] font-bold">Dívida/Credor</th>
                                        <th className="py-1 px-2 uppercase text-[8px] font-bold">Vlr. Parcela</th>
                                        <th className="py-1 px-2 uppercase text-[8px] font-bold">Prazo</th>
                                        <th className="py-1 px-2 uppercase text-[8px] font-bold">Juros</th>
                                        <th className="py-1 pl-2 uppercase text-[8px] font-bold text-right">Término</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {negotiations.map((neg: any, idx: number) => (
                                        <tr key={idx} className="border-b border-gray-100 last:border-0 text-[9px]">
                                            <td className="py-1.5 pr-2">
                                                <span className="font-bold block">{neg.name}</span>
                                                <span className="text-[7px] text-gray-500 uppercase">{neg.creditor}</span>
                                            </td>
                                            <td className="py-1.5 px-2 font-bold">
                                                {neg.installmentValue ? `R$ ${neg.installmentValue}` : '---'}
                                            </td>
                                            <td className="py-1.5 px-2">
                                                {neg.quantity ? `${neg.quantity}x` : '---'}
                                            </td>
                                            <td className="py-1.5 px-2">
                                                {neg.interestRate || '---'}
                                            </td>
                                            <td className="py-1.5 pl-2 text-right font-black text-sky-700 uppercase">
                                                {neg.endDate || '---'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            } catch (e) {
                return <div className="text-red-500 text-xs italic">Erro ao carregar dados de negociação</div>;
            }
        }

        // Special Case: Expense Limits (Step 3, Sub-item 1)
        if (stepId === 3 && subId === 1) {
            try {
                const limits = JSON.parse(value);
                const categories = Object.keys(limits).filter(cat => limits[cat] && limits[cat].trim() !== "");
                if (categories.length === 0) return null;

                return (
                    <div className="not-italic mt-2">
                        <strong className="block mb-2 text-[10px] uppercase border-b pb-1">Tetos Estabelecidos:</strong>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                            {categories.map(cat => (
                                <div key={cat} className="flex justify-between border-b border-gray-100 py-1 text-[9px]">
                                    <span className="text-gray-600 uppercase font-bold text-[8px]">{cat}</span>
                                    <span className="font-black text-emerald-700">R$ {limits[cat]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } catch (e) {
                return null;
            }
        }

        // Default: Plain text response
        return (
            <div className="mt-1 bg-gray-50 border border-gray-200 p-2 text-xs italic rounded">
                <strong>Resposta:</strong> {value}
            </div>
        );
    };

    const renderPrintView = () => (
        <div className="printable-checklist bg-white text-black">
            {activeTab === 'phase1' && (
                <>
                    <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-6 uppercase">Pilar 1: Diagnóstico e Sangria (Fase 1)</h2>
                    <div className="space-y-8">
                        {PHASE1_STEPS.map(step => (
                            <div key={step.id} className="avoid-break">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className={`mt-1 w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 ${completedSteps.includes(step.id) ? 'bg-black' : ''}`}>
                                        {completedSteps.includes(step.id) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight uppercase">{step.id}. {step.title}</h3>
                                        <p className="text-sm text-gray-700">{step.description}</p>
                                    </div>
                                </div>

                                {step.subItems && (
                                    <div className="ml-8 space-y-4 pt-2">
                                        {step.subItems.map(subItem => {
                                            const data = checklistData[step.id]?.subItems?.[subItem.id];
                                            return (
                                                <div key={subItem.id} className="border-l-2 border-gray-200 pl-4 py-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`w-4 h-4 border-2 border-black flex items-center justify-center shrink-0 ${data?.checked ? 'bg-black' : ''}`}>
                                                            {data?.checked && <CheckCircle2 size={12} className="text-white" />}
                                                        </div>
                                                        <span className="text-sm font-semibold">{subItem.text}</span>
                                                    </div>
                                                    {data?.value && renderSubItemValuePrint(step.id, subItem.id, data.value)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'phase2' && (
                <>
                    <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-6 uppercase">Pilar 2: Retorno e Blindagem (Fase 2)</h2>
                    <div className="space-y-8">
                        {PHASE2_STEPS.map(step => (
                            <div key={step.id} className="avoid-break">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className={`mt-1 w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 ${completedSteps.includes(step.id) ? 'bg-black' : ''}`}>
                                        {completedSteps.includes(step.id) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight uppercase">{step.id}. {step.title}</h3>
                                        <p className="text-sm text-gray-700">{step.description}</p>
                                    </div>
                                </div>

                                {step.subItems && (
                                    <div className="ml-8 space-y-4 pt-2">
                                        {step.subItems.map(subItem => {
                                            const data = checklistData[step.id]?.subItems?.[subItem.id];
                                            return (
                                                <div key={subItem.id} className="border-l-2 border-gray-200 pl-4 py-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`w-4 h-4 border-2 border-black flex items-center justify-center shrink-0 ${data?.checked ? 'bg-black' : ''}`}>
                                                            {data?.checked && <CheckCircle2 size={12} className="text-white" />}
                                                        </div>
                                                        <span className="text-sm font-semibold">{subItem.text}</span>
                                                    </div>
                                                    {data?.value && renderSubItemValuePrint(step.id, subItem.id, data.value)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    // Sync state with props when modal opens
    useEffect(() => {
        if (isOpen) {
            setCompletedSteps(initialProgress);
            setChecklistData(initialData || {});

            // Set initial tab based on phase
            if (phase === 'PHASE_2') {
                setActiveTab('phase2');
            } else {
                setActiveTab('phase1');
            }
        }
    }, [isOpen, phase]);
    // Removed initialData/initialProgress from deps to prevent re-render clobbering

    // Auto-save debounce effect for text
    useEffect(() => {
        if (readOnly) return;
        const timer = setTimeout(() => {
            if (onSave) {
                handleSave(completedSteps, checklistData);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [checklistData]);

    const stepsToRender = activeTab === 'phase2' ? PHASE2_STEPS : PHASE1_STEPS;
    // Calculate total progress across ALL steps? Or just current phase?
    // User progress array contains IDs from both phases. So showing phase-specific progress might be cleaner visually,
    // but overall progress is also useful. Let's show visible steps progress.

    const visibleStepIds = stepsToRender.map(s => s.id);
    const visibleCompleted = completedSteps.filter(id => visibleStepIds.includes(id)).length;
    const progress = Math.round((visibleCompleted / stepsToRender.length) * 100);

    const toggleStep = async (id: number) => {
        const step = stepsToRender.find(s => s.id === id);
        const hasSubItems = step && step.subItems && step.subItems.length > 0;

        // In read-only mode, only allow expanding/collapsing sub-items
        if (readOnly && !hasSubItems) return;

        // Se tem sub-itens, toggle apenas expande/colapsa
        if (hasSubItems) {
            setExpandedSteps(prev =>
                prev.includes(id) ? prev.filter(stepId => stepId !== id) : [...prev, id]
            );
            return;
        }

        // Se não tem sub-itens e NÃO é readOnly, funciona como check normal
        if (readOnly) return;

        const newProgress = completedSteps.includes(id)
            ? completedSteps.filter(s => s !== id)
            : [...completedSteps, id];

        setCompletedSteps(newProgress);
        handleSave(newProgress, checklistData);
    };

    const toggleSubItem = (stepId: number, subItemId: number) => {
        if (readOnly) return;

        const currentData = { ...checklistData };
        const stepData = currentData[stepId] || { subItems: {} };
        const subItems = stepData.subItems || {};
        const isChecked = subItems[subItemId]?.checked || false;

        // Update local state deep copy
        currentData[stepId] = {
            ...stepData,
            subItems: {
                ...subItems,
                [subItemId]: {
                    ...subItems[subItemId],
                    checked: !isChecked
                }
            }
        };

        setChecklistData(currentData);

        // Check if all sub-items are checked to complete the main step
        const stepConfig = stepsToRender.find(s => s.id === stepId);
        if (stepConfig && stepConfig.subItems) {
            const allChecked = stepConfig.subItems.every(sub => {
                // If this is the one we just toggled, use new value
                if (sub.id === subItemId) return !isChecked;
                // Otherwise check existing data
                return currentData[stepId]?.subItems?.[sub.id]?.checked;
            });

            let newProgress = completedSteps;
            if (allChecked && !completedSteps.includes(stepId)) {
                newProgress = [...completedSteps, stepId];
            } else if (!allChecked && completedSteps.includes(stepId)) {
                newProgress = completedSteps.filter(id => id !== stepId);
            }

            if (newProgress !== completedSteps) {
                setCompletedSteps(newProgress);
            }

            // Pass the updated progress to save along with data
            handleSave(newProgress, currentData);
        } else {
            handleSave(completedSteps, currentData);
        }
    };

    const handleInputChange = (stepId: number, subItemId: number, value: string) => {
        if (readOnly) return;

        const currentData = { ...checklistData };
        const stepData = currentData[stepId] || { subItems: {} };
        const subItems = stepData.subItems || {};

        currentData[stepId] = {
            ...stepData,
            subItems: {
                ...subItems,
                [subItemId]: {
                    ...subItems[subItemId],
                    value: value
                }
            }
        };

        setChecklistData(currentData);
        // Debounce handled by useEffect
    };

    const getStepStatus = (stepId: number): 'pending' | 'in_progress' | 'completed' => {
        if (completedSteps.includes(stepId)) return 'completed';

        const stepData = checklistData[stepId];
        if (!stepData) return 'pending';

        // Check if there is any data (checked sub-items or text values)
        const subItemsRaw = stepData.subItems ? Object.values(stepData.subItems) : [];
        const hasCheckedItems = subItemsRaw.some((s: any) => s.checked);
        const hasTextValues = subItemsRaw.some((s: any) => s.value && s.value.trim() !== '');

        if (hasCheckedItems || hasTextValues) return 'in_progress';

        return 'pending';
    };

    const handleSave = async (progress: number[], data: ChecklistData) => {
        if (onSave) {
            setIsSaving(true);
            try {
                await onSave(progress, data);
            } catch (error) {
                console.error("Failed to save progress", error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleClose = () => {
        if (!readOnly && onSave) {
            handleSave(completedSteps, checklistData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-rose-500/10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-rose-500 uppercase tracking-tight flex items-center gap-2">
                                Checklist Destruidor de Sanhaço
                                {readOnly && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-2">Modo Leitura</span>}
                            </h2>
                            <p className="text-xs text-rose-300/80 font-medium">
                                Seu guia de sobrevivência para não ficar no caos financeiro.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="p-2 bg-slate-800/50 hover:bg-slate-800 text-sky-400 rounded-xl transition-colors group relative"
                                title="Imprimir Checklist"
                            >
                                <Printer size={20} />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                                    Imprimir Relatório
                                </span>
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-2 bg-slate-800/50 hover:bg-slate-800 text-rose-400 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs - Only show if user has access to PHASE_2 */}
                    {(phase === 'PHASE_2' || (readOnly && phase === 'PHASE_2')) && (
                        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-slate-700/50">
                            <button
                                onClick={() => setActiveTab('phase1')}
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${activeTab === 'phase1'
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <ListChecks size={14} />
                                Fase 1: Consultoria
                            </button>
                            <button
                                onClick={() => setActiveTab('phase2')}
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${activeTab === 'phase2'
                                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <Target size={14} />
                                Fase 2: Retorno
                            </button>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                    <p className="text-sm text-slate-400 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <strong className={`${activeTab === 'phase2' ? 'text-amber-400' : 'text-rose-400'} uppercase text-xs block mb-1`}>
                            {activeTab === 'phase2' ? 'Fase de Retorno' : 'Fase de Diagnóstico'}
                        </strong>
                        {activeTab === 'phase2'
                            ? "Agora é hora de verificar a execução do plano, se negociou dívidas e garantiu que o orçamento fosse cumprido de acordo com a necessidade."
                            : "Este checklist não é um passeio no parque. É um plano de guerra. Marque cada etapa conforme você conquista o território."
                        }
                    </p>

                    <div className="space-y-3">
                        {stepsToRender.map((step) => {
                            const status = getStepStatus(step.id);
                            const isCompleted = status === 'completed';
                            const isInProgress = status === 'in_progress';
                            const hasSubItems = step.subItems && step.subItems.length > 0;
                            const isExpanded = expandedSteps.includes(step.id);

                            return (
                                <div key={step.id} className="flex flex-col gap-2">
                                    <div
                                        onClick={() => toggleStep(step.id)}
                                        className={`
                                                group p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 select-none
                                                ${!readOnly || hasSubItems ? 'cursor-pointer' : 'cursor-default'}
                                                ${isCompleted
                                                ? 'bg-emerald-500/5 border-emerald-500/20 ' + (readOnly ? '' : 'hover:bg-emerald-500/10')
                                                : isInProgress
                                                    ? 'bg-amber-500/5 border-amber-500/20 ' + (readOnly ? '' : 'hover:bg-amber-500/10')
                                                    : 'bg-slate-800/30 border-slate-700/50 ' + (readOnly ? '' : 'hover:border-rose-500/30 hover:bg-slate-800/60')
                                            }
                                            `}
                                    >
                                        <div className={`mt-1 shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' :
                                            isInProgress ? 'text-amber-500' :
                                                'text-slate-600 ' + (readOnly ? '' : 'group-hover:text-rose-500')
                                            }`}>
                                            {isCompleted ? <CheckCircle2 size={24} className="fill-emerald-500/10" /> :
                                                isInProgress ? <Clock size={24} className="fill-amber-500/10" /> :
                                                    <Circle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <h3 className={`text-sm font-bold uppercase tracking-wide mb-1 transition-colors ${isCompleted ? 'text-emerald-400 line-through decoration-emerald-500/50' :
                                                    isInProgress ? 'text-amber-400' :
                                                        'text-slate-200 ' + (readOnly ? '' : 'group-hover:text-white')
                                                    }`}>
                                                    {step.id}. {step.title}
                                                </h3>
                                                {hasSubItems && (
                                                    <div className="text-slate-600">
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-xs font-medium leading-relaxed transition-colors ${isCompleted ? 'text-emerald-500/60' :
                                                isInProgress ? 'text-amber-500/60' :
                                                    'text-slate-500 ' + (readOnly ? '' : 'group-hover:text-slate-400')
                                                }`}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Sub-items Render */}
                                    {hasSubItems && isExpanded && (
                                        <div className="ml-8 pl-4 border-l-2 border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            {step.subItems?.map(sub => {
                                                const subData = checklistData[step.id]?.subItems?.[sub.id];
                                                const isSubChecked = subData?.checked || false;
                                                const subValue = subData?.value || '';

                                                const showInput = sub.conditionalInput && (
                                                    (sub.conditionalInput.trigger === 'checked' && isSubChecked) ||
                                                    (sub.conditionalInput.trigger === 'unchecked' && !isSubChecked)
                                                );

                                                const showInfo = sub.info && (
                                                    (sub.info.trigger === 'checked' && isSubChecked)
                                                );

                                                return (
                                                    <div key={sub.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-3">
                                                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleSubItem(step.id, sub.id)}>
                                                            <div className={`mt-0.5 shrink-0 ${isSubChecked ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                                {isSubChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                            </div>
                                                            <span className={`text-xs font-medium ${isSubChecked ? 'text-slate-300' : 'text-slate-400'}`}>
                                                                {sub.text}
                                                            </span>
                                                        </div>
                                                        {showInfo && (
                                                            <div className="ml-7 text-[10px] text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20 flex gap-2">
                                                                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                                                {sub.info?.text}
                                                            </div>
                                                        )}

                                                        {showInput && !(step.id === 11 && sub.id === 2) && (
                                                            <div className="ml-7 space-y-1">
                                                                {sub.conditionalInput?.label && (
                                                                    <label className="text-[10px] uppercase font-bold text-slate-500 block">
                                                                        {sub.conditionalInput.label}
                                                                    </label>
                                                                )}
                                                                <textarea
                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none resize-none"
                                                                    rows={2}
                                                                    placeholder={sub.conditionalInput?.placeholder}
                                                                    value={subValue}
                                                                    onChange={(e) => handleInputChange(step.id, sub.id, e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Specific Logic for Expense Limits (Phase 1, Step 6, Subitem 3) */}
                                                        {step.id === 6 && sub.id === 3 && isSubChecked && financialData && activeTab === 'phase1' && (
                                                            <div className="ml-7 space-y-3 animate-in slide-in-from-top-2">
                                                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                                                    <div className="flex items-center gap-2 text-sky-400 pb-2 border-b border-slate-700/50">
                                                                        <Target size={14} />
                                                                        <span className="text-[10px] font-bold uppercase tracking-wide">Definir Limites Mensais</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-3">
                                                                        {financialData.estimatedExpenses.filter(e => Number(e.value) > 0).map(expense => {
                                                                            let limits: Record<string, string> = {};
                                                                            try {
                                                                                limits = subValue ? JSON.parse(subValue) : {};
                                                                            } catch (e) {
                                                                                limits = {};
                                                                            }
                                                                            const currentLimit = limits[expense.name] || '';

                                                                            return (
                                                                                <div key={expense.id} className="flex flex-col gap-1.5">
                                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                                        <span className="text-slate-300 font-medium">{expense.name}</span>
                                                                                        <span className="text-slate-500">Atual no diagnóstico: {Number(expense.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                                    </div>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="R$ 0,00"
                                                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-sky-500 outline-none transition-colors placeholder:text-slate-600"
                                                                                        value={currentLimit}
                                                                                        onChange={(e) => {
                                                                                            const newLimits = { ...limits, [expense.name]: e.target.value };
                                                                                            handleInputChange(step.id, sub.id, JSON.stringify(newLimits));
                                                                                        }}
                                                                                        disabled={readOnly}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        {financialData.estimatedExpenses.filter(e => Number(e.value) > 0).length === 0 && (
                                                                            <p className="text-[10px] text-slate-500 italic text-center py-2">Nenhum gasto variável encontrado no diagnóstico.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Specific Logic for Debt Negotiations (Phase 2, Step 11, Subitem 2) */}
                                                        {step.id === 11 && sub.id === 2 && isSubChecked && activeTab === 'phase2' && (
                                                            <div className="ml-7 space-y-3 animate-in slide-in-from-top-2">
                                                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                                                                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/50">
                                                                        <div className="flex items-center gap-2 text-amber-400">
                                                                            <ShieldCheck size={14} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wide">Detalhamento das Negociações</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                const currentNegotiationsArr: any[] = [];
                                                                                try {
                                                                                    const existing = subValue ? JSON.parse(subValue) : [];
                                                                                    if (Array.isArray(existing)) currentNegotiationsArr.push(...existing);
                                                                                } catch (e) { }

                                                                                // Merge: add missing debts from map
                                                                                const newNegotiations = [...currentNegotiationsArr];
                                                                                debtMapItems.forEach(debt => {
                                                                                    const exists = newNegotiations.find(n => n.debtId === debt.id);
                                                                                    if (!exists) {
                                                                                        newNegotiations.push({
                                                                                            debtId: debt.id,
                                                                                            name: debt.name,
                                                                                            creditor: debt.creditor,
                                                                                            installmentValue: '',
                                                                                            quantity: '',
                                                                                            interest: ''
                                                                                        });
                                                                                    }
                                                                                });
                                                                                handleInputChange(step.id, sub.id, JSON.stringify(newNegotiations));
                                                                            }}
                                                                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-[9px] font-bold uppercase"
                                                                            title="Sincronizar com Mapeamento Global"
                                                                        >
                                                                            <RefreshCw size={12} /> Atualizar Lista
                                                                        </button>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        {(() => {
                                                                            let negotiations: any[] = [];
                                                                            try {
                                                                                negotiations = subValue ? JSON.parse(subValue) : [];
                                                                                if (!Array.isArray(negotiations)) negotiations = [];
                                                                            } catch (e) {
                                                                                negotiations = [];
                                                                            }

                                                                            if (negotiations.length === 0 && debtMapItems.length > 0) {
                                                                                return (
                                                                                    <div className="text-center py-4 space-y-2">
                                                                                        <p className="text-[10px] text-slate-500 italic">Nenhuma negociação registrada.</p>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const now = new Date().toISOString();
                                                                                                const calculateEndDate = (months: number) => {
                                                                                                    if (!months || months <= 0) return '---';
                                                                                                    const date = new Date();
                                                                                                    date.setMonth(date.getMonth() + months);
                                                                                                    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                                                                                };

                                                                                                const initial = debtMapItems.map(d => {
                                                                                                    const qty = Number(d.remainingInstallments) || Number(d.totalInstallments) || 0;
                                                                                                    return {
                                                                                                        debtId: d.id,
                                                                                                        name: d.name,
                                                                                                        creditor: d.creditor,
                                                                                                        installmentValue: '',
                                                                                                        quantity: '',
                                                                                                        interest: '',
                                                                                                        createdAt: now,
                                                                                                        updatedAt: now,
                                                                                                        endDate: calculateEndDate(qty)
                                                                                                    };
                                                                                                });
                                                                                                handleInputChange(step.id, sub.id, JSON.stringify(initial));
                                                                                            }}
                                                                                            className="px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase hover:bg-amber-500/20 transition-all"
                                                                                        >
                                                                                            Importar Dívidas do Mapeamento
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return negotiations.map((neg, index) => {
                                                                                const originalDebt = debtMapItems.find(d => d.id === neg.debtId);
                                                                                const originalValue = Number(originalDebt?.installmentValue) || 0;
                                                                                const negotiatedValue = parseFloat(neg.installmentValue?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

                                                                                let diffColor = 'text-slate-500';
                                                                                if (negotiatedValue > 0) {
                                                                                    if (negotiatedValue < originalValue) diffColor = 'text-emerald-400';
                                                                                    else if (negotiatedValue > originalValue) diffColor = 'text-rose-400';
                                                                                    else diffColor = 'text-amber-400';
                                                                                }

                                                                                return (
                                                                                    <div key={neg.debtId || index} className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                                                                                        <div className="flex justify-between items-start text-[10px]">
                                                                                            <div>
                                                                                                <span className="text-slate-300 font-bold block">{neg.name}</span>
                                                                                                <span className="text-[8px] text-slate-500 uppercase block">{neg.creditor}</span>
                                                                                            </div>
                                                                                            <div className="flex flex-col text-[7px] text-slate-500 uppercase font-bold text-right gap-0.5">
                                                                                                <span>Registrado: {neg.createdAt ? new Date(neg.createdAt).toLocaleDateString('pt-BR') : '---'}</span>
                                                                                                <span>Atualizado: {neg.updatedAt ? new Date(neg.updatedAt).toLocaleDateString('pt-BR') : '---'}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-4 gap-2">
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] uppercase font-black text-slate-600">Parc. Atual</label>
                                                                                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-1.5 text-[10px] text-slate-400 font-bold">
                                                                                                    R$ {originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                                                </div>
                                                                                                <div className="mt-2 pt-1.5 border-t border-slate-700/30">
                                                                                                    <p className="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Prazo Ant.</p>
                                                                                                    <p className="text-[9px] text-slate-400 font-black">{Number(originalDebt?.remainingInstallments) || Number(originalDebt?.totalInstallments) || 0}x</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] uppercase font-black text-slate-600">Vlr. Parcela</label>
                                                                                                <div className="relative">
                                                                                                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${negotiatedValue > 0 ? diffColor : 'text-slate-500'}`}>R$</span>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        placeholder="0,00"
                                                                                                        className={`w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 pl-5 text-[10px] focus:border-amber-500 outline-none ${negotiatedValue > 0 ? diffColor + ' font-bold' : 'text-white'}`}
                                                                                                        value={neg.installmentValue}
                                                                                                        onChange={(e) => {
                                                                                                            const newNegs = [...negotiations];
                                                                                                            newNegs[index].installmentValue = e.target.value;
                                                                                                            newNegs[index].updatedAt = new Date().toISOString();
                                                                                                            handleInputChange(step.id, sub.id, JSON.stringify(newNegs));
                                                                                                        }}
                                                                                                        disabled={readOnly}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] uppercase font-black text-slate-600">Qtd. Parc.</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    placeholder="00"
                                                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-center text-[10px] text-white focus:border-amber-500 outline-none"
                                                                                                    value={neg.quantity}
                                                                                                    onChange={(e) => {
                                                                                                        const newNegs = [...negotiations];
                                                                                                        newNegs[index].quantity = e.target.value;
                                                                                                        newNegs[index].updatedAt = new Date().toISOString();

                                                                                                        const calculateEndDate = (months: number) => {
                                                                                                            if (!months || months <= 0) return '---';
                                                                                                            const date = new Date();
                                                                                                            date.setMonth(date.getMonth() + months);
                                                                                                            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                                                                                                        };
                                                                                                        newNegs[index].endDate = calculateEndDate(parseInt(e.target.value) || 0);

                                                                                                        handleInputChange(step.id, sub.id, JSON.stringify(newNegs));
                                                                                                    }}
                                                                                                    disabled={readOnly}
                                                                                                />
                                                                                                <div className="mt-2 pt-1 border-t border-slate-700/30">
                                                                                                    <p className="text-[7px] text-slate-500 uppercase font-bold mb-0.5">Término</p>
                                                                                                    <p className="text-[8px] text-sky-400 font-black uppercase">{neg.endDate || '---'}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <label className="text-[8px] uppercase font-black text-slate-600">Juros/CET</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    placeholder="0%"
                                                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[10px] text-white focus:border-amber-500 outline-none"
                                                                                                    value={neg.interestRate}
                                                                                                    onChange={(e) => {
                                                                                                        const newNegs = [...negotiations];
                                                                                                        newNegs[index].interestRate = e.target.value;
                                                                                                        handleInputChange(step.id, sub.id, JSON.stringify(newNegs));
                                                                                                    }}
                                                                                                    disabled={readOnly}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {visibleCompleted} / {stepsToRender.length} Etapas Concluídas
                        </span>
                        {!readOnly && (
                            <span className="text-[10px] text-slate-600 mt-1">
                                {isSaving ? "Salvando..." : "Salvo Automaticamente"}
                            </span>
                        )}
                    </div>
                    <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r transition-all duration-500 ${activeTab === 'phase2' ? 'from-amber-500 to-amber-300' : 'from-rose-500 to-emerald-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
            {isPrinting && (
                <PrintPortal>
                    <div className="p-8">
                        <PrintHeader user={user} title="Checklist Destruidor de Sanhaço" />
                        {renderPrintView()}
                    </div>
                </PrintPortal>
            )}

            {/* Cost of Living Modal */}
            {showCostOfLivingSummary && (
                <div className="animate-in fade-in zoom-in-95 duration-200 fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
                    <CostOfLiving
                        userId={user.id}
                        user={user}
                        initialView="summary"
                        onClose={() => setShowCostOfLivingSummary(false)}
                        onComplete={() => setShowCostOfLivingSummary(false)}
                        onFetch={async (uid) => {
                            return await authService.getCostOfLivingByAdmin(uid);
                        }}
                        onSave={async (uid, item) => {
                            await authService.saveCostOfLivingByAdmin(uid, item);
                            if (onCostOfLivingUpdate) onCostOfLivingUpdate();
                        }}
                        onDelete={async (iid) => {
                            await authService.deleteCostOfLivingItem(iid, user.id);
                            if (onCostOfLivingUpdate) onCostOfLivingUpdate();
                        }}
                    />
                </div>
            )}
        </div>
    );
};
