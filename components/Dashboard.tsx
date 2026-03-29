import React from 'react';
import { User as UserType, Anamnesis, ChecklistData, FinancialData, MentorshipState, MentorshipMeeting, DebtMapItem } from '../types';
import { UserIntakeModal } from './UserIntakeModal';
import { ChecklistModal } from './ChecklistModal';
import { authService } from '../services/authService';
import {
    User,
    LayoutDashboard,
    Brain,
    TrendingUp,
    Activity,
    Home,
    LogOut,
    CheckCircle2,
    Lock,
    PlayCircle,
    FileText,
    Calendar,
    Target,
    BarChart3,
    RefreshCw,
    Shield,
    ChevronRight,
    ListChecks,
    ShieldAlert,
    Plane,
    CreditCard,
    Building,
    ShieldCheck,
    HeartPulse,
    Car,
    PiggyBank,
    Landmark,
    Handshake,
    Briefcase,
    Umbrella
} from 'lucide-react';
import { MentorshipCard } from './Mentorship/MentorshipCard';
import { MeetingModal } from './Mentorship/MeetingModal';
import { Meeting1Content } from './Mentorship/Meeting1/Meeting1Content';
import { Meeting2Content } from './Mentorship/Meeting2/Meeting2Content';
import { Meeting3Content } from './Mentorship/Meeting3/Meeting3Content';
import { Meeting4Content } from './Mentorship/Meeting4/Meeting4Content';
import { Meeting5Content } from './Mentorship/Meeting5/Meeting5Content';
import { Meeting6Content } from './Mentorship/Meeting6/Meeting6Content';
import { ValueProposalM6 } from './Mentorship/Meeting6/ValueProposalM6';
import { ConsultingValueCard } from './ConsultingValueCard';

interface DashboardProps {
    user: UserType;
    anamnesisData: Anamnesis | null;
    hasDiagnosticData: boolean;
    onStartAnamnesis: () => void;
    onStartDiagnosis: () => void;
    onViewReport: () => void;
    onStartDebtMapping: () => void;
    onStartCostOfLiving: () => void;
    isCostOfLivingDone: boolean;
    onLogout: () => void;
    onEditProfile: () => void;
    currentUser: UserType; // The logged-in user (admin or self)
    onChecklistUpdate: (progress: number[], data: ChecklistData) => void;
    financialData: FinancialData;
    onUpdateFinancialData: (data: FinancialData) => void;
    debtMapItems: DebtMapItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({
    user,
    anamnesisData,
    hasDiagnosticData,
    onStartAnamnesis,
    onStartDiagnosis,
    onViewReport,
    onStartDebtMapping,
    onStartCostOfLiving,
    isDebtMappingDone,
    isCostOfLivingDone,
    onLogout,
    onEditProfile,
    currentUser,
    onChecklistUpdate,
    financialData,
    onUpdateFinancialData,
    debtMapItems
}) => {
    const isAnamnesisDone = !!anamnesisData;
    const [showIntakeModal, setShowIntakeModal] = React.useState(false);
    const [showChecklistModal, setShowChecklistModal] = React.useState(false);

    const [costUpdateTrigger, setCostUpdateTrigger] = React.useState(0);
    // Mentorship State
    const [mentorshipState, setMentorshipState] = React.useState<MentorshipState>({ meetings: [], nonRecurringExpenses: [] });
    const latestMeetingsRef = React.useRef<MentorshipMeeting[]>([]);
    const [selectedMeeting, setSelectedMeeting] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (user.id) {
            authService.getMentorshipState(user.id).then(state => {
                setMentorshipState(state);
                latestMeetingsRef.current = state.meetings;
            });
        }
    }, [user.id, selectedMeeting]); // Refresh when modal closes/changes

    const getMeeting = (id: number) => {
        const meeting = mentorshipState.meetings.find(m => m.meetingId === id);
        // All meetings default to locked now.
        let status = meeting?.status || 'locked';

        // Bloqueio condicional de segurança extra: se não tem diagnóstico finalizado, força bloqueio.
        if (!hasDiagnosticData && currentUser.role !== 'ADMIN') {
            status = 'locked';
        }

        return {
            userId: user.id,
            meetingId: id,
            status,
            data: meeting?.data || {}
        } as MentorshipMeeting;
    };

    const MEETING_TITLES = [
        "Reunião 1",
        "Reunião 2",
        "Reunião 3",
        "Reunião 4",
        "Reunião 5",
        "Reunião 6"
    ];

    // Lógica de Controle de Acesso Baseada no Status do Usuário
    const getAccessLevel = (status: string) => {
        switch (status) {
            case 'NEW': return 0; // Pré-Cadastro: Tudo Bloqueado
            case 'ACTIVE': return 1; // Consultoria: Módulos 1-4 Liberados
            case 'CONVERTED': return 2; // Mentoria: Módulos 1-10 Liberados
            case 'CONTACTED': return 3; // Acompanhamento: Tudo Liberado
            default: return 0; // Fallback
        }
    };

    const accessLevel = getAccessLevel(user.status);

    // Helpers de Bloqueio por Nível
    const isConsultoriaUnlocked = accessLevel >= 1 || currentUser.role === 'ADMIN';
    const isMentoriaUnlocked = accessLevel >= 2;
    const isAcompanhamentoUnlocked = accessLevel >= 3;

    // Helper para renderizar status e botão de ação dos módulos
    const renderModuleStatus = (
        isDone: boolean,
        isLockedByFlow: boolean, // Bloqueio por fluxo (ex: Diagnóstico precisa de Custo de Vida)
        onStart: () => void,
        onView: () => void,
        labelStart: string,
        labelView: string,
        minAccessLevel: number = 1 // Nível mínimo de acesso requerido
    ) => {
        // Se o nível de acesso do usuário for menor que o necessário, bloqueia hard
        if (accessLevel < minAccessLevel) {
            return (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg text-slate-500 text-xs font-bold uppercase cursor-not-allowed border border-slate-700/50">
                    <Lock size={14} /> Aguardando Liberação
                </div>
            );
        }

        // Se estiver bloqueado pelo fluxo (ex: anterior não feito), mantém bloqueio normal
        if (isLockedByFlow) {
            return (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg text-slate-500 text-xs font-bold uppercase cursor-not-allowed">
                    <Lock size={14} /> Bloqueado
                </div>
            );
        }

        if (isDone) {
            return (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase">
                        <CheckCircle2 size={16} /> Concluído
                    </div>
                    <button
                        onClick={onView}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold uppercase transition-colors flex items-center gap-2"
                    >
                        <FileText size={14} /> {labelView}
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={onStart}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 flex items-center gap-2"
            >
                <PlayCircle size={16} /> {labelStart}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-20">
            <div className={showIntakeModal ? 'print:hidden' : ''}>
                {/* Header */}
                <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/images/logo.png" alt="SOLUM Logo" className="h-12 w-auto object-contain" />
                            <div className="flex flex-col">
                                <h1 className="text-sm font-black text-white uppercase tracking-tight">Painel Principal</h1>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Bem-vindo, {user?.name?.split(' ')[0] || 'Visitante'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'SECRETARY') && (
                                <button
                                    onClick={() => setShowIntakeModal(true)}
                                    className="p-2.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white rounded-xl transition-colors flex items-center gap-2 border border-sky-500/20"
                                    title="Ficha Individual"
                                >
                                    <FileText size={18} />
                                    <span className="text-xs font-black uppercase hidden sm:inline">Ficha</span>
                                </button>
                            )}
                            <button
                                onClick={onEditProfile}
                                className="p-2.5 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors flex items-center gap-2"
                                title="Editar Dados"
                            >
                                <User size={18} />
                                <span className="text-xs font-black uppercase hidden sm:inline">Meus Dados</span>
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-colors flex items-center gap-2"
                                title="Sair"
                            >
                                <LogOut size={18} />
                                <span className="text-xs font-black uppercase hidden sm:inline">Sair</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

                    {/* Welcome Section */}
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                            Sua Jornada Financeira
                        </h2>
                        <p className="text-slate-400 font-medium max-w-2xl">
                            Complete os módulos abaixo para desbloquear uma visão completa do seu financeiro.
                            {/* 
                                [INSTRUÇÃO PARA REATIVAR O TEXTO DA VITRINE]:
                                Para voltar a mostrar o texto descritivo, descomente a linha abaixo:
                                Abaixo, você tem acesso a Área de Membros Exclusiva com os materiais e conteúdos que complementam a consultoria, acesse quando quiser com login e senha recebidos via e-mail pela Hotmart.
                            */}
                        </p>
                    </div>

                    {/* 
                        [INSTRUÇÃO PARA REATIVAR A VITRINE INTERATIVA]:
                        Para o banner da vitrine aparecer na tela novamente, basta selecionar da linha abaixo até 
                        a tag </div> logo antes de "Modules Grid" e apertar Ctrl + / (ou Cmd + /) para remover o comentário.
                    */}
                    {/*
                    <div className="max-w-[260px] mx-auto">
                        <a
                            href="https://hotmart.com/pt-br/club/thesolum"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative group overflow-hidden rounded-2xl border border-slate-800 shadow-xl transition-all hover:border-amber-500/50 hover:shadow-amber-500/10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500"></div>
                            <img
                                src="/images/vitrine.png"
                                alt="Acesse a Área de Membros Exclusiva"
                                className="w-full h-auto object-contain transform group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center justify-end p-4 text-center">
                                <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/50 group-hover:border-amber-500/50 transition-colors shadow-lg shadow-black/50">
                                    <div className="flex items-center gap-1.5 text-amber-400 font-black uppercase tracking-widest text-[9px] md:text-[10px]">
                                        <span className="group-hover:translate-x-0.5 transition-transform">Acessar Área de Membros</span>
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform delay-75" />
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                    */}

                    {/* Modules Grid */}
                    {/* Seção 1: Consultoria */}
                    <section className={`space-y-6 transition-opacity duration-500 ${isConsultoriaUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 border-b border-slate-800 pb-4">
                            <span className="text-sky-500">01.</span> Consultoria
                            {!isConsultoriaUnlocked && <Lock size={16} className="text-slate-500" />}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 1. Anamnese */}
                            <div className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all duration-300 ${isAnamnesisDone ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-900 border-sky-500/30 shadow-2xl shadow-sky-500/5'}`}>
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Brain size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAnamnesisDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                            <Brain size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">1. Anamnese</h3>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                Entendimento profundo do seu perfil comportamental, objetivos e relação com o dinheiro.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800/50">
                                        {renderModuleStatus(
                                            isAnamnesisDone,
                                            false,
                                            onStartAnamnesis,
                                            onStartAnamnesis, // Visualizar é abrir o form preenchido
                                            "Começar Agora",
                                            "Ver Respostas",
                                            1 // Requer Consultoria (Nível 1)
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Mapeamento de Dívidas */}
                            <div className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all duration-300 ${isAnamnesisDone ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Activity size={120} />
                                </div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAnamnesisDone ? 'bg-sky-500/10 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">2. Mapeamento de Dívidas</h3>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                Cadastre detalhadamente todas as suas dívidas para que seja possível montar uma estratégia de quitação.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800/50">
                                        {renderModuleStatus(
                                            isDebtMappingDone,
                                            !isAnamnesisDone,
                                            onStartDebtMapping,
                                            onStartDebtMapping,
                                            "Mapear Dívidas",
                                            "Ver Mapeamento",
                                            1 // Requer Consultoria
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Custo de Vida */}
                            <div className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all duration-300 ${isDebtMappingDone ? 'bg-slate-900 border-indigo-500/30 shadow-2xl shadow-indigo-500/5 hover:border-indigo-500/50' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Home size={120} />
                                </div>
                                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDebtMappingDone ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                            <Home size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">3. Custo de Vida</h3>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                Definição do padrão de vida sustentável baseado na sua realidade real.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800/50">
                                        {renderModuleStatus(
                                            isCostOfLivingDone,
                                            !isDebtMappingDone,
                                            onStartCostOfLiving,
                                            onStartCostOfLiving,
                                            "Definir Custo de Vida",
                                            "Ver Custo de Vida",
                                            1 // Requer Consultoria
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Diagnóstico Financeiro Personalizado */}
                            <div className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all duration-300 ${isCostOfLivingDone ? 'bg-slate-900 border-emerald-500/30 shadow-2xl shadow-emerald-500/5 hover:border-emerald-500/50' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <TrendingUp size={120} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${hasDiagnosticData ? 'bg-emerald-500/10 text-emerald-400' : (isCostOfLivingDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500')}`}>
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">4. Diagnóstico Financeiro Personalizado</h3>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                Mapeamento detalhado de rendas, despesas e dívidas para cálculo de indicadores vitais.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800/50">
                                        {renderModuleStatus(
                                            hasDiagnosticData, // TODO: Consider a stricter check for "Completed" if needed, e.g. (hasDiagnosticData && isWizardFinished)
                                            !isCostOfLivingDone, // Locked if Cost of Living is NOT done
                                            onStartDiagnosis,
                                            onViewReport,
                                            hasDiagnosticData ? "Continuar Mapeamento" : "Iniciar Mapeamento", // If started but not done, show "Continue"
                                            "Ver Relatório Completo",
                                            1 // Requer Consultoria
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Checklist Destruidor de Sanhaço (Condicional) */}
                        {(user.checklistPhase === 'PHASE_1' || user.checklistPhase === 'PHASE_2') && (
                            <div className="mt-6 flex flex-col gap-6">
                                <div className="group relative overflow-hidden rounded-[2rem] border p-8 transition-all duration-300 bg-slate-900 border-rose-500/30 shadow-2xl shadow-rose-500/5 hover:border-rose-500/50">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <ListChecks size={120} />
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                                        <div className="space-y-4">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-400">
                                                <ListChecks size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Checklist Destruidor de Sanhaço</h3>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                                    {user.checklistPhase === 'PHASE_2'
                                                        ? "Fase de Retorno: renegociação, cortes e ajustes finos."
                                                        : "Guia de sobrevivência passo-a-passo para não ficar no caos financeiro."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-800/50">
                                            <button
                                                onClick={() => setShowChecklistModal(true)}
                                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide text-xs transition-all shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 ${user.checklistPhase === 'PHASE_2'
                                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-900/20 hover:shadow-amber-500/20'
                                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20 hover:shadow-rose-500/20'
                                                    }`}
                                            >
                                                {user.checklistPhase === 'PHASE_2' ? "Acessar Fase de Retorno" : "Acessar Guia de Guerra"} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {user.checklistPhase === 'PHASE_2' && (
                                    <ConsultingValueCard
                                        financialData={financialData}
                                        checklistData={user.checklistData || {}}
                                        debtMapItems={debtMapItems}
                                        user={user}
                                        costUpdateTrigger={costUpdateTrigger}
                                    />
                                )}
                            </div>
                        )}
                    </section>

                    <ChecklistModal
                        isOpen={showChecklistModal}
                        onClose={() => setShowChecklistModal(false)}
                        initialProgress={user.checklistProgress || []}
                        initialData={user.checklistData || {}}
                        readOnly={currentUser.role === 'USER'}
                        financialData={financialData}
                        debtMapItems={debtMapItems}
                        phase={user.checklistPhase || 'LOCKED'}
                        user={user}
                        onCostOfLivingUpdate={() => setCostUpdateTrigger(prev => prev + 1)}
                        onSave={async (newProgress, newData) => {
                            if (currentUser.role === 'USER') return; // Double check security
                            await authService.updateChecklistProgress(user.id, newProgress);
                            await authService.updateChecklistData(user.id, newData);
                            onChecklistUpdate(newProgress, newData);
                        }}
                    />

                    {/* Seção 2: Mentoria */}
                    <section className={`space-y-6 transition-opacity duration-500 ${isMentoriaUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 border-b border-slate-800 pb-4">
                            <span className="text-purple-500">02.</span> Mentoria
                            {!isMentoriaUnlocked && <Lock size={16} className="text-slate-500" />}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(id => {
                                const meeting = getMeeting(id);
                                const canUnlock = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETARY';

                                return (
                                    <MentorshipCard
                                        key={id}
                                        meetingId={id}
                                        title={MEETING_TITLES[id - 1]}
                                        status={meeting.status}
                                        onClick={() => isMentoriaUnlocked && setSelectedMeeting(id)}
                                        onUnlock={canUnlock && meeting.status === 'locked' ? async () => {
                                            try {
                                                await authService.updateMeetingStatus(user.id, id, 'unlocked');
                                                const state = await authService.getMentorshipState(user.id);
                                                setMentorshipState(state);
                                            } catch (error) {
                                                console.error('Erro ao liberar reunião:', error);
                                                alert('Erro ao liberar reunião. Tente novamente.');
                                            }
                                        } : undefined}
                                        onLock={canUnlock && meeting.status !== 'locked' ? async () => {
                                            try {
                                                await authService.updateMeetingStatus(user.id, id, 'locked');
                                                const state = await authService.getMentorshipState(user.id);
                                                setMentorshipState(state);
                                            } catch (error) {
                                                console.error('Erro ao bloquear reunião:', error);
                                                alert('Erro ao bloquear reunião. Tente novamente.');
                                            }
                                        } : undefined}
                                    />
                                );
                            })}
                        </div>

                        {/* Proposta de Valor da Mentoria (Reunião 6) */}
                        {isMentoriaUnlocked && getMeeting(6).status === 'unlocked' && (
                            <div className="mt-8">
                                <ValueProposalM6
                                    meetingData={getMeeting(6).data}
                                    m3Data={getMeeting(3).data}
                                    currentUser={currentUser as any}
                                    readOnly={currentUser.role === 'USER'}
                                    onUpdateMeetingData={async (data) => {
                                        let finalData = data;
                                        if (typeof data === 'function') {
                                            const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 6);
                                            finalData = data(currentMeeting?.data || {});
                                        }

                                        let updatedMeetings = latestMeetingsRef.current.map(m =>
                                            m.meetingId === 6 ? { ...m, data: finalData } : m
                                        );
                                        if (!latestMeetingsRef.current.find(m => m.meetingId === 6)) {
                                            updatedMeetings.push({ ...getMeeting(6), data: finalData });
                                        }
                                        latestMeetingsRef.current = updatedMeetings;
                                        setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                        await authService.saveMeetingData(user.id, 6, finalData);
                                    }}
                                />
                            </div>
                        )}
                    </section>

                    {/* Mentorship Modal */}
                    <MeetingModal
                        isOpen={!!selectedMeeting}
                        onClose={() => setSelectedMeeting(null)}
                        meetingId={selectedMeeting || 0}
                        title={selectedMeeting ? MEETING_TITLES[selectedMeeting - 1] : ''}
                    >
                        {selectedMeeting === 1 ? (
                            <Meeting1Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(1).data}
                                meetingStatus={getMeeting(1).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 1);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 1 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 1)) {
                                        updatedMeetings.push({ ...getMeeting(1), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 1, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    // Call parent to update global state
                                    onUpdateFinancialData(data);
                                    // And save to DB
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 1, 'completed');
                                    // Unlock next? Not auto for now.
                                    setSelectedMeeting(null);
                                    // Refresh state
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 1, 'unlocked');
                                    // Refresh state
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : selectedMeeting === 2 ? (
                            <Meeting2Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(2).data}
                                previousMeetingData={getMeeting(1).data}
                                meetingStatus={getMeeting(2).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 2);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 2 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 2)) {
                                        updatedMeetings.push({ ...getMeeting(2), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 2, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    onUpdateFinancialData(data);
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 2, 'completed');
                                    setSelectedMeeting(null);
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 2, 'unlocked');
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : selectedMeeting === 3 ? (
                            <Meeting3Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(3).data}
                                previousMeetingData={getMeeting(2).data}
                                meetingStatus={getMeeting(3).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 3);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 3 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 3)) {
                                        updatedMeetings.push({ ...getMeeting(3), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 3, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    onUpdateFinancialData(data);
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 3, 'completed');
                                    setSelectedMeeting(null);
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 3, 'unlocked');
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : selectedMeeting === 4 ? (
                            <Meeting4Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(4).data}
                                meetingStatus={getMeeting(4).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 4);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 4 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 4)) {
                                        updatedMeetings.push({ ...getMeeting(4), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 4, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    onUpdateFinancialData(data);
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 4, 'completed');
                                    setSelectedMeeting(null);
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 4, 'unlocked');
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : selectedMeeting === 5 ? (
                            <Meeting5Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(5).data}
                                previousMeetingData={getMeeting(4).data}
                                meetingStatus={getMeeting(5).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 5);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 5 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 5)) {
                                        updatedMeetings.push({ ...getMeeting(5), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 5, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    onUpdateFinancialData(data);
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 5, 'completed');
                                    setSelectedMeeting(null);
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 5, 'unlocked');
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : selectedMeeting === 6 ? (
                            <Meeting6Content
                                user={user}
                                userId={user.id}
                                currentUser={currentUser}
                                financialData={financialData}
                                checklistData={user.checklistData || {}}
                                meetingData={getMeeting(6).data}
                                m5Data={getMeeting(5).data}
                                m4Data={getMeeting(4).data}
                                m3Data={getMeeting(3).data}
                                meetingStatus={getMeeting(6).status}
                                onUpdateMeetingData={async (data) => {
                                    let finalData = data;
                                    if (typeof data === 'function') {
                                        const currentMeeting = latestMeetingsRef.current.find(m => m.meetingId === 6);
                                        finalData = data(currentMeeting?.data || {});
                                    }

                                    let updatedMeetings = latestMeetingsRef.current.map(m =>
                                        m.meetingId === 6 ? { ...m, data: finalData } : m
                                    );
                                    if (!latestMeetingsRef.current.find(m => m.meetingId === 6)) {
                                        updatedMeetings.push({ ...getMeeting(6), data: finalData });
                                    }
                                    latestMeetingsRef.current = updatedMeetings;
                                    setMentorshipState(prev => ({ ...prev, meetings: updatedMeetings }));

                                    await authService.saveMeetingData(user.id, 6, finalData);
                                }}
                                onUpdateFinancialData={async (data) => {
                                    onUpdateFinancialData(data);
                                    await authService.saveDiagnostic(user.id, data);
                                }}
                                onComplete={async () => {
                                    await authService.updateMeetingStatus(user.id, 6, 'completed');
                                    setSelectedMeeting(null);
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                                onUnlock={async () => {
                                    await authService.updateMeetingStatus(user.id, 6, 'unlocked');
                                    const state = await authService.getMentorshipState(user.id);
                                    setMentorshipState(state);
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Lock className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-lg font-bold">Conteúdo em desenvolvimento.</p>
                            </div>
                        )}
                    </MeetingModal>

                    {/* Seção 3: Acompanhamento */}
                    <section className={`space-y-6 transition-opacity duration-500`}>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 border-b border-slate-800 pb-4">
                            <span className="text-emerald-500">03.</span> Acompanhamento
                            {!isAcompanhamentoUnlocked && <Lock size={16} className="text-slate-500" />}
                        </h3>

                        {!isAcompanhamentoUnlocked ? (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 opacity-90 z-0 pointer-events-none" />
                                <div className="absolute inset-0 flex items-center justify-center z-10 opacity-10 pointer-events-none">
                                    <ShieldAlert size={120} className="text-slate-500" />
                                </div>
                                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 relative z-20">
                                    <Lock className="text-slate-500" size={24} />
                                </div>
                                <h3 className="text-xl font-black text-white relative z-20 uppercase tracking-widest">Conteúdo Oculto, Exclusivo</h3>
                                <p className="text-slate-400 max-w-md relative z-20">Este módulo é desbloqueado apenas na fase de Acompanhamento da Mentoria.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[
                                    { title: "Milhas", icon: <Plane size={24} />, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", hover: "hover:border-sky-500/50" },
                                    { title: "Cartão de Crédito", icon: <CreditCard size={24} />, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", hover: "hover:border-indigo-500/50" },
                                    { title: "Separação PJ e PF", icon: <Building size={24} />, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", hover: "hover:border-rose-500/50" },
                                    { title: "Seguros", icon: <ShieldCheck size={24} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", hover: "hover:border-emerald-500/50" },
                                    { title: "Plano de Saúde", icon: <HeartPulse size={24} />, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20", hover: "hover:border-pink-500/50" },
                                    { title: "Consórcio", icon: <Car size={24} />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", hover: "hover:border-amber-500/50" },
                                    { title: "Reserva de Emergência", icon: <PiggyBank size={24} />, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", hover: "hover:border-orange-500/50" },
                                    { title: "Sucessão Patrimonial", icon: <Landmark size={24} />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", hover: "hover:border-purple-500/50" },
                                    { title: "Investimentos", icon: <TrendingUp size={24} />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", hover: "hover:border-emerald-500/50" },
                                    { title: "Negociação de Dívidas", icon: <Handshake size={24} />, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", hover: "hover:border-rose-500/50" },
                                    { title: "Transição de Carreira", icon: <Briefcase size={24} />, color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", hover: "hover:border-teal-500/50" },
                                    { title: "Aposentadoria", icon: <Umbrella size={24} />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", hover: "hover:border-blue-500/50" },
                                ].map((card, idx) => (
                                    <div key={idx} className={`bg-slate-900/60 border ${card.border} ${card.hover} rounded-2xl p-6 transition-all duration-300 flex flex-col items-center text-center gap-4 group cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50`}>
                                        <div className={`w-14 h-14 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center border ${card.border} group-hover:scale-110 transition-transform duration-300`}>
                                            {card.icon}
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{card.title}</h4>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main >
            </div >

            {/* User Intake Modal (Ficha Individual) moved outside main layout for print isolation */}
            {
                showIntakeModal && (
                    <UserIntakeModal
                        user={user}
                        isOpen={showIntakeModal}
                        onClose={() => setShowIntakeModal(false)}
                    />
                )
            }
        </div >
    );
};
