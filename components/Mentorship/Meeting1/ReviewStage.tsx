import React, { useState, useEffect } from 'react';
import { CheckCircle2, Edit2, Save, X, AlertCircle, ArrowUp, ArrowDown, Minus, RefreshCcw } from 'lucide-react';
import { FinancialData, ChecklistData } from '../../../types';
import { CATEGORIES } from '../../CostOfLiving';

interface ReviewStageProps {
    financialData: FinancialData;
    checklistData: ChecklistData;
    meetingData: any;
    onUpdateMeetingData: (data: any) => void;
    onUpdateFinancialData: (data: FinancialData) => void;
    readOnly?: boolean;
    onPrint?: () => void;
    previousMeetingData?: any;
    feedbackQuestion?: string;
}

interface ReviewItem {
    id: string;
    name: string;
    type: 'Fixa' | 'Variável';
    reference: number; // Read-only (Checklist Original)
    defined: number;   // Editable (Checklist Snapshot)
    realized: number;  // Manual Input
}

export const ReviewStage: React.FC<ReviewStageProps> = ({
    financialData,
    checklistData,
    meetingData,
    onUpdateMeetingData,
    onUpdateFinancialData,
    readOnly = false,
    onPrint,
    previousMeetingData,
    feedbackQuestion
}) => {
    const [bankChecked, setBankChecked] = useState(meetingData?.bankChecked || false);
    const [feedbackValue, setFeedbackValue] = useState(meetingData?.feedback || '');
    const [items, setItems] = useState<ReviewItem[]>(meetingData?.reviewItems || []);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editField, setEditField] = useState<'defined' | 'realized' | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setFeedbackValue(val);
        onUpdateMeetingData((prev: any) => ({ ...prev, feedback: val }));
    };

    // Initialization Logic
    useEffect(() => {
        if (!meetingData?.reviewItems || meetingData.reviewItems.length === 0) {
            // 1. Get Limits from Checklist (Phase 1, Step 6, Subitem 3)
            const limitsNode = checklistData?.[6]?.subItems?.[3];
            const budgetLimits: Record<string, string> = limitsNode?.value
                ? JSON.parse(limitsNode.value)
                : {};

            // 2. Build Items List
            const initialItems: ReviewItem[] = CATEGORIES.map(cat => {
                const catName = cat.id;
                let referenceVal = parseFloat(budgetLimits[catName] || '0');

                // If we have previous meeting data, the "Defined" value from there becomes our "Reference"
                if (previousMeetingData?.reviewItems) {
                    const prevItem = previousMeetingData.reviewItems.find((i: any) => i.name === catName);
                    if (prevItem) referenceVal = prevItem.defined;
                }

                return {
                    id: `review-${catName}`,
                    name: catName,
                    type: 'Variável',
                    reference: referenceVal,
                    defined: referenceVal,
                    realized: 0
                };
            });

            setItems(initialItems);
            onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: initialItems }));
        } else {
            setItems(meetingData.reviewItems);
        }
    }, []); // Run once on mount

    // Sync logic for Reference values from previous meeting
    useEffect(() => {
        if (previousMeetingData?.reviewItems && items.length > 0) {
            let hasChanges = false;
            const updatedItems = items.map(item => {
                const prevItem = previousMeetingData.reviewItems.find((i: any) => i.name === item.name);
                if (prevItem && prevItem.defined !== item.reference) {
                    hasChanges = true;
                    return { ...item, reference: prevItem.defined };
                }
                return item;
            });

            if (hasChanges) {
                setItems(updatedItems);
                // Also update persistent data so it's ready when saved
                onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: updatedItems }));
            }
        }
    }, [previousMeetingData, items.length]);

    const handleToggleBankCheck = () => {
        if (readOnly) return;
        const newState = !bankChecked;
        setBankChecked(newState);
        onUpdateMeetingData((prev: any) => ({ ...prev, bankChecked: newState, feedback: feedbackValue }));
    };

    const startEdit = (id: string, field: 'defined' | 'realized', currentValue: number) => {
        if (readOnly) return;
        setEditingId(id);
        setEditField(field);
        setTempValue(currentValue === 0 && field === 'realized' ? '' : currentValue.toString());
    };

    const saveEdit = (id: string) => {
        const numValue = parseFloat(tempValue.replace(',', '.'));
        const finalValue = isNaN(numValue) ? 0 : numValue;

        const newItems = items.map(item => {
            if (item.id === id) {
                return { ...item, [editField!]: finalValue };
            }
            return item;
        });

        setItems(newItems);
        onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: newItems, bankChecked, feedback: feedbackValue }));
        setEditingId(null);
        setEditField(null);
    };

    const handleManualSave = () => {
        // Explicitly trigger update to ensure persistence
        onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: items, bankChecked, feedback: feedbackValue }));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleRefresh = () => {
        if (readOnly) return;

        // 1. Get Updated Limits from Checklist
        const limitsNode = checklistData?.[6]?.subItems?.[3];
        const budgetLimits: Record<string, string> = limitsNode?.value
            ? JSON.parse(limitsNode.value)
            : {};

        const refreshedItems = items.map(item => {
            let newReference = parseFloat(budgetLimits[item.name] || '0');

            // If Meeting 2 (has previous), use M1's Defined as Reference
            if (previousMeetingData?.reviewItems) {
                const prevItem = previousMeetingData.reviewItems.find((i: any) => i.name === item.name);
                if (prevItem) newReference = prevItem.defined;
            }

            return {
                ...item,
                reference: newReference,
                defined: newReference // Pre-fill defined with reference as per request
            };
        });

        setItems(refreshedItems);
        onUpdateMeetingData((prev: any) => ({
            ...prev, reviewItems: refreshedItems,
            bankChecked,
            feedback: feedbackValue
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in relative pb-20 print:space-y-4 print:p-10 print:max-w-[210mm] print:mx-auto">
            {/* Header Actions - Print */}
            <div className="flex justify-end print:hidden">
                <button
                    onClick={() => onPrint ? onPrint() : window.print()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    title="Imprimir visualização"
                >
                    <div className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </div>
                    <span className="text-sm font-bold uppercase">Imprimir</span>
                </button>
            </div>

            {/* 0. Feedback (Optional) */}
            {feedbackQuestion && (
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                        1. Feedback do Mês
                    </h3>
                    <div className="space-y-3">
                        <p className="text-slate-300 font-medium">
                            {feedbackQuestion}
                        </p>
                        <textarea
                            value={feedbackValue}
                            onChange={handleFeedbackChange}
                            readOnly={readOnly}
                            placeholder="Sua resposta aqui..."
                            className={`
                                w-full min-h-[100px] p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 
                                placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 
                                outline-none transition-all resize-none
                                ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}
                                print:hidden
                            `}
                        />
                        {/* Print-only version that expands naturally */}
                        <div className="hidden print:block min-h-[100px] p-4 rounded-xl border border-gray-300 text-black whitespace-pre-wrap text-sm leading-relaxed">
                            {feedbackValue || 'Nenhuma observação registrada.'}
                        </div>
                    </div>
                </div>
            )}

            {/* 1 or 2. Extrato Bancário */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                    {feedbackQuestion ? '2' : '1'}. Conferência de Extrato
                </h3>
                <label className={`flex items-start gap-3 group ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mt-1
            ${bankChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-emerald-500'}`}
                    >
                        {bankChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                        <span className="text-slate-300 font-medium">Validar lançamentos com o Extrato Bancário</span>
                        <p className="text-sm text-slate-500 mt-1">
                            Verifique se todos os gastos lançados na plataforma correspondem ao que está no seu banco.
                        </p>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={bankChecked}
                            onChange={handleToggleBankCheck}
                            disabled={readOnly}
                        />
                    </div>
                </label>
            </div>

            {/* 2 or 3. Orçamento vs Realizado */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                        {feedbackQuestion ? '3' : '2'}. Orçamento vs Realizado
                        {readOnly && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 uppercase">Somente Leitura</span>}
                    </h3>

                    {!readOnly && (
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all text-xs font-bold group"
                            title="Sincronizar com etapa anterior"
                        >
                            <RefreshCcw size={14} className="group-active:rotate-180 transition-transform duration-500" />
                            Sincronizar Dados
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase print:text-gray-500 print:border-gray-300">
                                <th className="p-3">Categoria</th>
                                <th className="p-3 text-right bg-slate-900/40 print:bg-gray-50">Referência</th>
                                <th className="p-3 text-right">Definido</th>
                                <th className="p-3 text-right">Realizado</th>
                                <th className="p-3 text-center">%</th>
                                <th className="p-3 text-right">Diferença</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                            {items.map(item => {
                                const percentage = item.defined > 0 ? (item.realized / item.defined) * 100 : 0;
                                const difference = item.defined - item.realized;
                                const isOver = difference < 0;

                                return (
                                    <tr key={item.id} className="hover:bg-slate-900/20 transition-colors print:text-black">
                                        <td className="p-3 font-medium text-slate-300 print:text-black">
                                            {item.name}
                                        </td>

                                        {/* Reference (Read-only) */}
                                        <td className={`p-3 text-right bg-slate-900/40 text-sm ${item.reference === 0 ? 'text-slate-600 italic' : 'text-slate-500'} print:bg-gray-50 print:text-gray-600`}>
                                            {item.reference === 0 ? 'Não previsto' : `R$ ${item.reference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        </td>

                                        {/* Defined (Editable) */}
                                        <td className="p-3 text-right print:text-black">
                                            {editingId === item.id && editField === 'defined' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={tempValue}
                                                        onChange={e => setTempValue(e.target.value)}
                                                        onBlur={() => saveEdit(item.id)}
                                                        onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                                        className="w-20 bg-slate-800 border border-slate-600 rounded px-1 text-right text-sm text-white focus:border-sky-500 outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(item.id, 'defined', item.defined)}
                                                    className={`group flex items-center justify-end gap-2 text-sm ${readOnly ? 'cursor-default text-slate-400' : 'cursor-pointer text-white hover:text-sky-400'}`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {item.defined > item.reference ? (
                                                            <ArrowUp size={12} className="text-rose-400" title="Aumentou em relação à referência" />
                                                        ) : item.defined < item.reference ? (
                                                            <ArrowDown size={12} className="text-emerald-400" title="Diminuiu em relação à referência" />
                                                        ) : (
                                                            <Minus size={12} className="text-slate-600" title="Manteve o valor" />
                                                        )}
                                                        <span className={`${item.reference === 0 && item.defined > 0 ? 'text-amber-400 font-bold' : ''}`}>
                                                            R$ {item.defined.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    {!readOnly && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />}
                                                </div>
                                            )}
                                        </td>

                                        {/* Realized (Editable) */}
                                        <td className="p-3 text-right">
                                            {editingId === item.id && editField === 'realized' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={tempValue}
                                                        onChange={e => setTempValue(e.target.value)}
                                                        onBlur={() => saveEdit(item.id)}
                                                        onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                                                        className="w-20 bg-slate-800 border border-slate-600 rounded px-1 text-right text-sm text-white focus:border-emerald-500 outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(item.id, 'realized', item.realized)}
                                                    className={`group flex items-center justify-end gap-2 text-sm ${readOnly ? 'cursor-default text-slate-400' : 'cursor-pointer hover:text-emerald-400'} ${item.realized === 0 ? 'text-slate-600' : ''}`}
                                                >
                                                    {item.realized > 0 ? `R$ ${item.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                    {!readOnly && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                </div>
                                            )}
                                        </td>

                                        {/* Percentage */}
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentage > 100 ? 'bg-rose-500/10 text-rose-400' :
                                                    percentage > 80 ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-emerald-500/10 text-emerald-400'
                                                    }`}>
                                                    {percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>

                                        {/* Difference */}
                                        <td className={`p-3 text-right font-bold text-sm ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {isOver ? '-' : ''} R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-900/80 border-t border-slate-800">
                            <tr>
                                <td className="p-3 font-black text-slate-400 uppercase text-xs">Totais</td>
                                <td className="p-3 text-right text-slate-500 font-bold text-xs">
                                    R$ {items.reduce((acc, i) => acc + i.reference, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right text-slate-300 font-bold text-xs">
                                    R$ {items.reduce((acc, i) => acc + i.defined, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right text-slate-300 font-bold text-xs">
                                    R$ {items.reduce((acc, i) => acc + i.realized, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                                <td className={`p-3 text-right font-bold text-xs ${items.reduce((acc, i) => acc + (i.defined - i.realized), 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    R$ {items.reduce((acc, i) => acc + (i.defined - i.realized), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Bottom Save Button - Explicit "Conclusion" */}
            {!readOnly && (
                <div className="flex justify-end pt-6 border-t border-slate-800 print:hidden">
                    <button
                        onClick={handleManualSave}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        {showSuccess ? (
                            <>
                                <CheckCircle2 size={18} /> Salvo!
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Salvar e Concluir Etapa
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
