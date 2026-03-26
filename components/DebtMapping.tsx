import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Plus,
    Trash2,
    DollarSign,
    Calendar,
    Percent,
    CreditCard,
    ArrowLeft,
    TrendingDown,
    Building2,
    CalendarClock,
    ThumbsUp
} from 'lucide-react';
import { DebtMapItem } from '../types';
import { PrintPortal } from './PrintPortal';
import { PrintHeader } from './Mentorship/Meeting1/PrintHeader';

interface DebtMappingProps {
    onClose?: () => void;
    onSave: (data: DebtMapItem[]) => void;
    initialData?: DebtMapItem[];
    isStandalone?: boolean;
    user?: {
        name: string;
        email: string;
        whatsapp: string;
    };
}

export const DebtMapping: React.FC<DebtMappingProps> = ({ onClose, onSave, initialData = [], isStandalone = false, user }) => {
    const [debts, setDebts] = useState<DebtMapItem[]>(initialData);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [creditor, setCreditor] = useState('');
    const [originalValue, setOriginalValue] = useState('');
    const [installmentValue, setInstallmentValue] = useState('');
    const [totalInstallments, setTotalInstallments] = useState(''); // Just for record if needed, but we focus on remaining
    const [remainingInstallments, setRemainingInstallments] = useState('');
    const [interestRate, setInterestRate] = useState('');

    // Calculated Preview
    const calculatePreview = () => {
        const remaining = parseInt(remainingInstallments) || 0;
        const value = parseFloat(installmentValue.replace(',', '.')) || 0;
        const total = remaining * value;

        const now = new Date();
        // Set to first day of month to avoid overflow (e.g. Jan 31 + 1 month -> March)
        now.setDate(1);
        const endData = new Date(now.setMonth(now.getMonth() + remaining));

        return {
            totalCurrent: total,
            endDate: endData
        };
    };

    const preview = calculatePreview();

    const handleAddDebt = () => {
        if (!name || !originalValue || !installmentValue || !remainingInstallments) return;

        const newItem: DebtMapItem = {
            id: editingId || crypto.randomUUID(),
            name,
            creditor,
            originalValue: parseFloat(originalValue.toString().replace(',', '.')),
            installmentValue: parseFloat(installmentValue.toString().replace(',', '.')),
            totalInstallments: parseInt(totalInstallments) || 0,
            remainingInstallments: parseInt(remainingInstallments),
            currentValue: preview.totalCurrent,
            interestRate,
            endDate: preview.endDate.toISOString(),
            createdAt: editingId ? debts.find(d => d.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString()
        };

        if (editingId) {
            setDebts(debts.map(d => d.id === editingId ? newItem : d));
            setEditingId(null);
        } else {
            setDebts([...debts, newItem]);
        }

        resetForm();
        setIsFormOpen(false);
    };

    const handleEdit = (debt: DebtMapItem) => {
        setName(debt.name);
        setCreditor(debt.creditor);
        setOriginalValue(debt.originalValue.toString());
        setInstallmentValue(debt.installmentValue.toString());
        setTotalInstallments(debt.totalInstallments.toString());
        setRemainingInstallments(debt.remainingInstallments.toString());
        setInterestRate(debt.interestRate);
        setEditingId(debt.id);
        setIsFormOpen(true);
    };

    const handleDeleteDebt = (id: string) => {
        setDebts(debts.filter(d => d.id !== id));
    };

    const handleSaveAll = () => {
        if (name || originalValue || installmentValue) {
            alert("Você tem dados preenchidos no formulário. Clique em 'Salvar Dívida' para incluí-los na lista antes de continuar.");
            return;
        }
        onSave(debts);
    };

    const handleNoDebts = () => {
        if (window.confirm("Confirmar que você não possui dívidas?")) {
            const noDebtItem: DebtMapItem = {
                id: 'no-debts',
                name: 'Não possui dívidas',
                creditor: '-',
                originalValue: 0,
                installmentValue: 0,
                totalInstallments: 0,
                remainingInstallments: 0,
                currentValue: 0,
                interestRate: '0',
                endDate: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            onSave([noDebtItem]);
        }
    };

    const resetForm = () => {
        setName('');
        setCreditor('');
        setOriginalValue('');
        setInstallmentValue('');
        setTotalInstallments('');
        setRemainingInstallments('');
        setInterestRate('');
        setEditingId(null);
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 300);
    };

    const wrapperClasses = isStandalone
        ? "min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-0 md:p-6 print:p-0 print:bg-white print:text-black"
        : "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:relative print:bg-white print:text-black print:p-0";

    const containerClasses = isStandalone
        ? "w-full max-w-4xl mx-auto bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:min-h-[80vh] md:rounded-3xl border border-slate-800 print:shadow-none print:border-none print:bg-white print:h-auto print:rounded-none"
        : "bg-slate-900 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-800 flex flex-col print:shadow-none print:border-none print:bg-white print:max-w-none print:max-h-none print:overflow-visible";

    return (
        <div className={wrapperClasses}>
            <div className={containerClasses}>
                {/* Header */}
                <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 flex justify-between items-center print:static print:bg-white print:border-slate-200">
                    <div className="flex items-center gap-4">
                        {onClose && (
                            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors print:hidden">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 print:text-black">
                                <TrendingDown className="text-rose-500 print:text-black" size={24} />
                                Mapeamento de Dívidas
                            </h2>
                            <span className="text-xs text-slate-400 font-bold uppercase print:hidden">Cadastre todas as suas dívidas ativas</span>

                            {/* Inline Print Info Removed - Used in Portal */}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block print:block">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block print:text-slate-600">Total Mensal</span>
                            <span className="text-lg font-black text-white print:text-black">
                                {debts.reduce((acc, curr) => acc + curr.installmentValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="w-px h-8 bg-slate-800 hidden sm:block print:hidden"></div>
                        <div className="text-right hidden sm:block print:block">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block print:text-slate-600">Total Devido</span>
                            <span className="text-lg font-black text-rose-400 print:text-black">
                                {debts.reduce((acc, curr) => acc + curr.currentValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="p-2 hover:bg-slate-800 rounded-full text-sky-400 hover:text-white transition-colors print:hidden"
                            title="Imprimir / Salvar PDF"
                        >
                            <Save size={20} className="hidden" /> {/* Reuse Save icon? No, let's use a Print icon if available or just text */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto print:overflow-visible">

                    {debts.length === 0 && !isFormOpen ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4 print:hidden">
                            <TrendingDown size={48} className="text-slate-700" />
                            <p className="font-medium">Nenhuma dívida cadastrada</p>
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Adicionar Dívida
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
                            {/* List of Debts */}
                            <div className="space-y-4 print:space-y-2">
                                <div className="flex justify-between items-center mb-4 print:hidden">
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Suas Dívidas ({debts.length})</h3>
                                    {!isFormOpen && (
                                        <button
                                            onClick={() => {
                                                resetForm();
                                                setIsFormOpen(true);
                                            }}
                                            className="px-3 py-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Nova
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 print:space-y-4">
                                    {debts.map(debt => (
                                        <div key={debt.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-rose-500/30 transition-colors group relative print:bg-white print:border-slate-200 print:shadow-sm print:break-inside-avoid">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-white mb-0.5 print:text-black">{debt.name}</h4>
                                                    <div className="flex items-center gap-1 text-slate-400 text-xs print:text-slate-600">
                                                        <Building2 size={12} />
                                                        <span>{debt.creditor || 'Credor não informado'}</span>
                                                        <span className="mx-1">•</span>
                                                        <span className="text-[10px] opacity-70">
                                                            Cadastro: {new Date(debt.createdAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 print:hidden">
                                                    <button
                                                        onClick={() => handleEdit(debt)}
                                                        className="p-1.5 text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Editar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDebt(debt.id)}
                                                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-3">
                                                <div>
                                                    <span className="block text-slate-500 font-bold uppercase text-[10px] print:text-slate-600">Valor Parcela</span>
                                                    <span className="text-slate-300 font-mono print:text-black">
                                                        {debt.installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-500 font-bold uppercase text-[10px] print:text-slate-600">Restam</span>
                                                    <span className="text-slate-300 font-mono flex items-center gap-1 print:text-black">
                                                        <CalendarClock size={12} className="text-sky-400 print:text-slate-800" />
                                                        {debt.remainingInstallments}x
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-slate-500 font-bold uppercase text-[10px] print:text-slate-600">Juros (CET)</span>
                                                    <span className="text-slate-300 font-mono flex items-center gap-1 print:text-black">
                                                        <Percent size={12} className="text-amber-400 print:text-slate-800" />
                                                        {debt.interestRate ? `${debt.interestRate}%` : '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center print:border-slate-200">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase print:text-slate-600">Término Previsto</span>
                                                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1 print:text-black">
                                                        <Calendar size={12} className="print:text-slate-800" />
                                                        {new Date(debt.endDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase print:text-slate-600">Total Atual</span>
                                                    <div className="text-rose-400 font-black text-sm print:text-black">
                                                        {debt.currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Form Area */}
                            {isFormOpen && (
                                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl animate-in slide-in-from-right duration-300 print:hidden">
                                    <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            {editingId ? <span className="text-amber-400">Editar Dívida</span> : <span className="text-sky-400 flex gap-2 items-center"><Plus size={16} /> Adicionar Nova Dívida</span>}
                                        </h3>
                                        <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Dívida</label>
                                                <div className="relative">
                                                    <CreditCard className="absolute left-3 top-3 text-slate-500" size={16} />
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Ex: Empréstimo Pessoal"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Credor / Banco</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3 top-3 text-slate-500" size={16} />
                                                    <input
                                                        type="text"
                                                        value={creditor}
                                                        onChange={(e) => setCreditor(e.target.value)}
                                                        placeholder="Ex: Banco X"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Original (Empréstimo)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-bold">R$</span>
                                                    <input
                                                        type="number"
                                                        value={originalValue}
                                                        onChange={(e) => setOriginalValue(e.target.value)}
                                                        placeholder="0,00"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor da Parcela</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-bold">R$</span>
                                                    <input
                                                        type="number"
                                                        value={installmentValue}
                                                        onChange={(e) => setInstallmentValue(e.target.value)}
                                                        placeholder="0,00"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Parcelas Restantes</label>
                                                <div className="relative">
                                                    <CalendarClock className="absolute left-3 top-3 text-slate-500" size={16} />
                                                    <input
                                                        type="number"
                                                        value={remainingInstallments}
                                                        onChange={(e) => setRemainingInstallments(e.target.value)}
                                                        placeholder="Ex: 12"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Juros / CET (% a.m.)</label>
                                                <div className="relative">
                                                    <Percent className="absolute left-3 top-3 text-slate-500" size={16} />
                                                    <input
                                                        type="text"
                                                        value={interestRate}
                                                        onChange={(e) => setInterestRate(e.target.value)}
                                                        placeholder="Ex: 2.5"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Auto-Calculation Preview */}
                                        <div className="bg-slate-900/50 rounded-xl p-4 mt-4 border border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-slate-500 uppercase font-bold">Expectativa</span>
                                                <span className="text-[10px] text-sky-400 uppercase font-bold bg-sky-500/10 px-2 py-0.5 rounded">Calculado agora</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">Término em</span>
                                                    <span className="text-sm font-bold text-white block">
                                                        {remainingInstallments ? preview.endDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '-'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">Total a Pagar</span>
                                                    <span className="text-sm font-black text-rose-400 block">
                                                        {preview.totalCurrent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleAddDebt}
                                            disabled={!name || !originalValue || !installmentValue || !remainingInstallments}
                                            className={`w-full py-3 ${editingId ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'} disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2 mt-4`}
                                        >
                                            <Save size={16} /> {editingId ? 'Atualizar Dívida' : 'Salvar Dívida'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 flex justify-between items-center print:hidden">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="flex gap-4">
                        {debts.length === 0 && (
                            <button
                                onClick={handleNoDebts}
                                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <ThumbsUp size={16} /> Não Possuo Dívidas
                            </button>
                        )}
                        <button
                            onClick={handleSaveAll}
                            className="px-8 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <Save size={16} /> Concluir Mapeamento
                        </button>
                    </div>
                </div>
            </div>

            {isPrinting && (
                <PrintPortal>
                    <div className="p-8 bg-white text-black">
                        <PrintHeader user={user || { name: 'Cliente', email: '', id: '', role: 'USER' }} title="Mapeamento de Dívidas" />

                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase block">Total Mensal</span>
                                    <span className="text-xl font-black text-black">
                                        {debts.reduce((acc, curr) => acc + curr.installmentValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-500 uppercase block">Total Devido</span>
                                    <span className="text-xl font-black text-black">
                                        {debts.reduce((acc, curr) => acc + curr.currentValue, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {debts.map(debt => (
                                    <div key={debt.id} className="border border-slate-200 rounded-xl p-4 break-inside-avoid">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-black mb-0.5">{debt.name}</h4>
                                                <div className="flex items-center gap-1 text-slate-600 text-xs">
                                                    <Building2 size={12} />
                                                    <span>{debt.creditor || 'Credor não informado'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                                            <div>
                                                <span className="block text-slate-500 font-bold uppercase text-[10px]">Valor Parcela</span>
                                                <span className="text-black font-mono">
                                                    {debt.installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-bold uppercase text-[10px]">Restam</span>
                                                <span className="text-black font-mono flex items-center gap-1">
                                                    {debt.remainingInstallments}x
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-500 font-bold uppercase text-[10px]">Juros (CET)</span>
                                                <span className="text-black font-mono flex items-center gap-1">
                                                    {debt.interestRate ? `${debt.interestRate}%` : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Término Previsto</span>
                                                <div className="text-black font-bold text-xs">
                                                    {new Date(debt.endDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Total Atual</span>
                                                <div className="text-black font-black text-sm">
                                                    {debt.currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {debts.length === 0 && (
                                    <p className="text-center text-slate-500 italic py-8">Nenhuma dívida cadastrada.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </PrintPortal>
            )}
        </div>
    );
};
