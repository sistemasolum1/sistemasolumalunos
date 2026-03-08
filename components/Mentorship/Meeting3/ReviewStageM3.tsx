import React, { useState, useEffect } from 'react';
import { CheckCircle2, Edit2, Save, X, AlertCircle, ArrowUp, ArrowDown, Minus, Wallet, RefreshCcw } from 'lucide-react';
import { FinancialData, ChecklistData } from '../../../types';
import { CATEGORIES } from '../../CostOfLiving';

interface ReviewStageM3Props {
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
    reference: number; // Read-only (Meeting 2 Result)
    defined: number;   // Editable (Checklist Snapshot)
    realized: number;  // Manual Input
}

export const ReviewStageM3: React.FC<ReviewStageM3Props> = ({
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
    const [quebraGalhoChecked, setQuebraGalhoChecked] = useState(meetingData?.quebraGalhoChecked || false);
    const [quebraGalhoValue, setQuebraGalhoValue] = useState(meetingData?.quebraGalhoValue || '');
    const [quebraGalhoObservation, setQuebraGalhoObservation] = useState(meetingData?.quebraGalhoObservation || '');
    const [gastosNaoRecorrentesChecked, setGastosNaoRecorrentesChecked] = useState(meetingData?.gastosNaoRecorrentesChecked || false);
    const [gastosNaoRecorrentesValue, setGastosNaoRecorrentesValue] = useState(meetingData?.gastosNaoRecorrentesValue || '');
    const [gastosNaoRecorrentesObservation, setGastosNaoRecorrentesObservation] = useState(meetingData?.gastosNaoRecorrentesObservation || '');
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

                // For Meeting 3, the "Defined" value from Meeting 2 becomes our "Reference"
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
    }, []);

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
                onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: updatedItems }));
            }
        }
    }, [previousMeetingData, items.length]);

    const handleToggleBankCheck = () => {
        if (readOnly) return;
        const newState = !bankChecked;
        setBankChecked(newState);
        onUpdateMeetingData((prev: any) => ({ ...prev, bankChecked: newState }));
    };

    const handleToggleQuebraGalho = () => {
        if (readOnly) return;
        const newState = !quebraGalhoChecked;
        setQuebraGalhoChecked(newState);
        onUpdateMeetingData((prev: any) => ({ ...prev, quebraGalhoChecked: newState }));
    };

    const handleQuebraGalhoValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuebraGalhoValue(val);
        onUpdateMeetingData((prev: any) => ({ ...prev, quebraGalhoValue: val }));
    };

    const handleQuebraGalhoObservationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setQuebraGalhoObservation(val);
        onUpdateMeetingData((prev: any) => ({ ...prev, quebraGalhoObservation: val }));
    };

    const handleToggleGastosNaoRecorrentes = () => {
        if (readOnly) return;
        const newState = !gastosNaoRecorrentesChecked;
        setGastosNaoRecorrentesChecked(newState);
        onUpdateMeetingData((prev: any) => ({ ...prev, gastosNaoRecorrentesChecked: newState }));
    };

    const handleGastosNaoRecorrentesValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setGastosNaoRecorrentesValue(val);
        onUpdateMeetingData((prev: any) => ({ ...prev, gastosNaoRecorrentesValue: val }));
    };

    const handleGastosNaoRecorrentesObservationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setGastosNaoRecorrentesObservation(val);
        onUpdateMeetingData((prev: any) => ({ ...prev, gastosNaoRecorrentesObservation: val }));
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
        onUpdateMeetingData((prev: any) => ({ ...prev, reviewItems: newItems }));
        setEditingId(null);
        setEditField(null);
    };

    const handleManualSave = () => {
        onUpdateMeetingData((prev: any) => ({
            ...prev, reviewItems: items,
            bankChecked,
            quebraGalhoChecked,
            quebraGalhoValue,
            quebraGalhoObservation,
            gastosNaoRecorrentesChecked,
            gastosNaoRecorrentesValue,
            gastosNaoRecorrentesObservation,
            feedback: feedbackValue
        }));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleRefresh = () => {
        if (readOnly) return;

        const refreshedItems = items.map(item => {
            let newReference = item.reference;

            // Use M2's Defined as Reference for M3
            if (previousMeetingData?.reviewItems) {
                const prevItem = previousMeetingData.reviewItems.find((i: any) => i.name === item.name);
                if (prevItem) newReference = prevItem.defined;
            }

            return {
                ...item,
                reference: newReference,
                defined: newReference
            };
        });

        setItems(refreshedItems);
        onUpdateMeetingData((prev: any) => ({
            ...prev, reviewItems: refreshedItems,
            bankChecked,
            quebraGalhoChecked,
            quebraGalhoValue,
            quebraGalhoObservation,
            gastosNaoRecorrentesChecked,
            gastosNaoRecorrentesValue,
            gastosNaoRecorrentesObservation,
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

            {/* 1. Feedback do Mês */}
            {feedbackQuestion && (
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                        1. Feedback do Mês
                    </h3>
                    <div className="space-y-3">
                        <p className="text-slate-300 font-medium">{feedbackQuestion}</p>
                        <textarea
                            value={feedbackValue}
                            onChange={handleFeedbackChange}
                            readOnly={readOnly}
                            placeholder="Sua resposta aqui..."
                            className={`w-full min-h-[100px] p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all resize-none ${readOnly ? 'opacity-70 cursor-not-allowed' : ''} print:hidden`}
                        />
                        <div className="hidden print:block min-h-[100px] p-4 rounded-xl border border-gray-300 text-black whitespace-pre-wrap text-sm leading-relaxed">
                            {feedbackValue || 'Nenhuma observação registrada.'}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Conferência de Extrato */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                    2. Conferência de Extrato
                </h3>
                <label className={`flex items-start gap-3 group ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mt-1 ${bankChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-emerald-500'}`}>
                        {bankChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1">
                        <span className="text-slate-300 font-medium">Validar lançamentos com o Extrato Bancário</span>
                        <p className="text-sm text-slate-500 mt-1">Verifique se todos os gastos correspondendo ao seu banco.</p>
                        <input type="checkbox" className="hidden" checked={bankChecked} onChange={handleToggleBankCheck} disabled={readOnly} />
                    </div>
                </label>
            </div>

            {/* 3. Reserva Quebra Galho (NEW) */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                    3. Reserva Quebra Galho
                </h3>
                <div className="space-y-6">
                    <label className={`flex items-start gap-3 group ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mt-1 ${quebraGalhoChecked ? 'bg-sky-500 border-sky-500' : 'border-slate-600 group-hover:border-sky-500'}`}>
                            {quebraGalhoChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                            <span className="text-slate-300 font-medium">Conseguiu guardar algum valor na reserva quebra galho?</span>
                            <input type="checkbox" className="hidden" checked={quebraGalhoChecked} onChange={handleToggleQuebraGalho} disabled={readOnly} />
                        </div>
                    </label>

                    {quebraGalhoChecked ? (
                        <div className="pl-9 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-bold text-sky-400 uppercase tracking-wider">Valor Economizado (R$)</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3 print:bg-gray-50 print:border-gray-300">
                                    <Wallet className="w-5 h-5 text-sky-500" />
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={quebraGalhoValue}
                                        onChange={handleQuebraGalhoValueChange}
                                        readOnly={readOnly}
                                        className="bg-transparent border-none outline-none text-white font-black text-xl w-full placeholder:text-slate-700 print:text-black"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="pl-9 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por que não foi possível guardar?</label>
                            <textarea
                                placeholder="Descreva o motivo ou observação..."
                                value={quebraGalhoObservation}
                                onChange={handleQuebraGalhoObservationChange}
                                readOnly={readOnly}
                                className="w-full min-h-[80px] p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-300 outline-none focus:border-slate-600 print:bg-white print:border-gray-300 print:text-black"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Carteira de Gastos Não Recorrentes */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 print:bg-white print:border-gray-200 print:text-black">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                    4. Carteira de Gastos Não Recorrentes
                </h3>
                <div className="space-y-6">
                    <label className={`flex items-start gap-3 group ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors mt-1 ${gastosNaoRecorrentesChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-indigo-500'}`}>
                            {gastosNaoRecorrentesChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                            <span className="text-slate-300 font-medium">Conseguiu guardar algum valor na carteira de Gastos Não Recorrentes?</span>
                            <input type="checkbox" className="hidden" checked={gastosNaoRecorrentesChecked} onChange={handleToggleGastosNaoRecorrentes} disabled={readOnly} />
                        </div>
                    </label>

                    {gastosNaoRecorrentesChecked ? (
                        <div className="pl-9 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Valor Economizado (R$)</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center gap-3 print:bg-gray-50 print:border-gray-300">
                                    <Wallet className="w-5 h-5 text-indigo-500" />
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={gastosNaoRecorrentesValue}
                                        onChange={handleGastosNaoRecorrentesValueChange}
                                        readOnly={readOnly}
                                        className="bg-transparent border-none outline-none text-white font-black text-xl w-full placeholder:text-slate-700 print:text-black"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="pl-9 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por que não foi possível guardar?</label>
                            <textarea
                                placeholder="Descreva o motivo ou observação..."
                                value={gastosNaoRecorrentesObservation}
                                onChange={handleGastosNaoRecorrentesObservationChange}
                                readOnly={readOnly}
                                className="w-full min-h-[80px] p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-300 outline-none focus:border-slate-600 print:bg-white print:border-gray-300 print:text-black"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 5. Orçamento vs Realizado */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                        5. Orçamento vs Realizado
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
                                <th className="p-3 text-right bg-slate-900/40 print:bg-gray-50">Ref (M2)</th>
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
                                        <td className="p-3 font-medium text-slate-300 print:text-black">{item.name}</td>
                                        <td className={`p-3 text-right bg-slate-900/40 text-sm ${item.reference === 0 ? 'text-slate-600 italic' : 'text-slate-500'} print:bg-gray-50 print:text-gray-600`}>
                                            {item.reference === 0 ? 'Não previsto' : `R$ ${item.reference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        </td>
                                        <td className="p-3 text-right print:text-black">
                                            {editingId === item.id && editField === 'defined' ? (
                                                <input autoFocus type="text" value={tempValue} onChange={e => setTempValue(e.target.value)} onBlur={() => saveEdit(item.id)} onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)} className="w-20 bg-slate-800 border border-slate-600 rounded px-1 text-right text-sm text-white focus:border-sky-500 outline-none" />
                                            ) : (
                                                <div onClick={() => startEdit(item.id, 'defined', item.defined)} className={`group flex items-center justify-end gap-2 text-sm ${readOnly ? 'cursor-default text-slate-400' : 'cursor-pointer text-white hover:text-sky-400'}`}>
                                                    <div className="flex items-center gap-1.5 font-bold">
                                                        {item.defined > item.reference ? <ArrowUp size={12} className="text-rose-400" /> : item.defined < item.reference ? <ArrowDown size={12} className="text-emerald-400" /> : <Minus size={12} className="text-slate-600" />}
                                                        <span>R$ {item.defined.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {!readOnly && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {editingId === item.id && editField === 'realized' ? (
                                                <input autoFocus type="text" value={tempValue} onChange={e => setTempValue(e.target.value)} onBlur={() => saveEdit(item.id)} onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)} className="w-20 bg-slate-800 border border-slate-600 rounded px-1 text-right text-sm text-white focus:border-emerald-500 outline-none" />
                                            ) : (
                                                <div onClick={() => startEdit(item.id, 'realized', item.realized)} className={`group flex items-center justify-end gap-2 text-sm ${readOnly ? 'cursor-default text-slate-400' : 'cursor-pointer hover:text-emerald-400'} ${item.realized === 0 ? 'text-slate-600' : ''}`}>
                                                    {item.realized > 0 ? `R$ ${item.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                    {!readOnly && <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentage > 100 ? 'bg-rose-500/10 text-rose-400' : percentage > 80 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {percentage.toFixed(0)}%
                                            </span>
                                        </td>
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
                                <td className="p-3 text-right text-slate-500 font-bold text-xs">R$ {items.reduce((acc, i) => acc + i.reference, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right text-slate-300 font-bold text-xs">R$ {items.reduce((acc, i) => acc + i.defined, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right text-slate-300 font-bold text-xs">R$ {items.reduce((acc, i) => acc + i.realized, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                                <td className={`p-3 text-right font-bold text-xs ${items.reduce((acc, i) => acc + (i.defined - i.realized), 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    R$ {items.reduce((acc, i) => acc + (i.defined - i.realized), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {!readOnly && (
                <div className="flex justify-end pt-6 border-t border-slate-800 print:hidden">
                    <button onClick={handleManualSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                        {showSuccess ? <><CheckCircle2 size={18} /> Salvo!</> : <><Save size={18} /> Salvar e Concluir Etapa</>}
                    </button>
                </div>
            )}
        </div>
    );
};
