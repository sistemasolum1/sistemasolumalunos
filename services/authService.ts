import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
import { User, UserRole, FinancialData, UserStatus, Anamnesis, DebtMapItem, CostOfLivingItem, MentorshipMeeting, NonRecurringExpenseItem, MentorshipState } from '../types';

export const authService = {
    // Inicialização (pode carregar sessão)
    // Inicialização (pode carregar sessão)
    initialize: async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
            return await authService.getCurrentUser();
        }
        return null;
    },

    login: async (email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, message: error.message };
        }

        if (data.user) {
            const user = await authService.getCurrentUser();
            if (user) return { success: true, user };
        }

        return { success: false, message: 'Erro ao obter dados do usuário.' };
    },

    register: async (userData: Omit<User, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; user?: User; message?: string }> => {
        // 1. Criar usuário no Auth
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password || 'mudar123', // Senha temporária ou fornecida
            options: {
                data: {
                    name: userData.name,
                    whatsapp: userData.whatsapp,
                    role: userData.role || 'USER'
                }
            }
        });

        if (error) return { success: false, message: error.message };

        if (data.user) {
            // O trigger no banco vai criar o profile automaticamente
            // Vamos esperar um pouco ou retornar o objeto construído
            const newUser: User = {
                id: data.user.id,
                name: userData.name,
                email: userData.email,
                whatsapp: userData.whatsapp,
                role: userData.role,
                status: 'NEW',
                createdAt: new Date().toISOString()
            };
            return { success: true, user: newUser };
        }

        return { success: false, message: 'Erro ao criar conta.' };
    },

    logout: async () => {
        await supabase.auth.signOut();
    },

    getCurrentUser: async (): Promise<User | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Buscar dados do profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile) return null;

        return {
            id: profile.id,
            name: profile.name || 'Usuário',
            email: user.email!,
            whatsapp: profile.whatsapp,
            role: profile.role,
            status: profile.status,
            createdAt: profile.created_at,
            checklistPhase: profile.checklist_phase as 'LOCKED' | 'PHASE_1' | 'PHASE_2',
            checklistProgress: profile.checklist_progress || [],
            checklistData: profile.checklist_data || {}
            // password é omitido
        };
    },

    getUserById: async (userId: string): Promise<User | null> => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) return null;

        return {
            id: profile.id,
            name: profile.name || 'Usuário',
            email: profile.email || '',
            whatsapp: profile.whatsapp,
            role: profile.role,
            status: profile.status,
            createdAt: profile.created_at,
            lastContactedBy: profile.last_contacted_by,
            checklistPhase: profile.checklist_phase as 'LOCKED' | 'PHASE_1' | 'PHASE_2',
            checklistProgress: profile.checklist_progress || [],
            checklistData: profile.checklist_data || {}
        };
    },

    updateUserChecklistPhase: async (userId: string, phase: 'LOCKED' | 'PHASE_1' | 'PHASE_2') => {
        const { error } = await supabase
            .from('profiles')
            .update({ checklist_phase: phase })
            .eq('id', userId);

        if (error) {
            console.error('Erro ao atualizar fase do checklist:', error);
            throw error;
        }
    },

    updateChecklistProgress: async (userId: string, progress: number[]) => {
        const { error } = await supabase
            .from('profiles')
            .update({ checklist_progress: progress })
            .eq('id', userId);

        if (error) {
            console.error('Erro ao atualizar progresso do checklist:', error);
            throw error;
        }
    },

    updateChecklistData: async (userId: string, data: any) => {
        const { error } = await supabase
            .from('profiles')
            .update({ checklist_data: data })
            .eq('id', userId);

        if (error) {
            console.error('Erro ao atualizar dados do checklist:', error);
            throw error;
        }
    },

    // Gerenciamento de Diagnósticos
    saveDiagnostic: async (userId: string, data: FinancialData) => {
        // Verifica se já existe
        const { data: existing } = await supabase
            .from('diagnostics')
            .select('user_id')
            .eq('user_id', userId)
            .single();

        if (existing) {
            await supabase
                .from('diagnostics')
                .update({
                    data: data,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
        } else {
            await supabase
                .from('diagnostics')
                .insert({
                    user_id: userId,
                    data: data
                });
        }
    },

    getDiagnosticByUser: async (userId: string): Promise<FinancialData | null> => {
        const { data, error } = await supabase
            .from('diagnostics')
            .select('data, updated_at')
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;

        const financialData = data.data as FinancialData;
        financialData.lastUpdated = data.updated_at;

        return financialData;
    },

    updateCurrentProfile: async (updates: { name?: string; whatsapp?: string; password?: string; email?: string }) => {
        const { password, email, ...meta } = updates;
        const authUpdates: any = {};

        if (password) authUpdates.password = password;
        if (email) authUpdates.email = email;

        // 1. Update Auth (Password/Email)
        if (Object.keys(authUpdates).length > 0) {
            const { error } = await supabase.auth.updateUser(authUpdates);
            if (error) throw error;
        }

        // 2. Update Profile (Name/Whatsapp)
        if (Object.keys(meta).length > 0) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update(meta)
                    .eq('id', user.id);
                if (error) throw error;
            }
        }
    },

    // Anamnese
    saveAnamnesis: async (userId: string, data: Omit<Anamnesis, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        const { error } = await supabase
            .from('anamnese')
            .insert({
                user_id: userId,
                reason: data.reason,
                objectives: data.objectives,
                spends_all: data.spendsAll,
                emergency_fund: data.emergencyFund,
                investments: data.investments,
                invests_monthly: data.investsMonthly,
                retirement_plan: data.retirementPlan,
                independent_decisions: data.independentDecisions,
                financial_score: data.financialScore
            });

        if (error) throw new Error(error.message);
    },

    getAnamnesis: async (userId: string): Promise<any | null> => {
        const { data, error } = await supabase
            .from('anamnese')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            userId: data.user_id,
            reason: data.reason,
            objectives: data.objectives,
            spendsAll: data.spends_all,
            emergencyFund: data.emergency_fund,
            investments: data.investments,
            investsMonthly: data.invests_monthly,
            retirementPlan: data.retirement_plan,
            independentDecisions: data.independent_decisions,
            financialScore: data.financial_score,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    // Gerenciamento de Usuários (Admin/Secretário)
    listUsers: async (): Promise<User[]> => {
        // Precisamos dos emails que estão no auth.users, mas tabela profiles não tem email por padrão se não duplicarmos.
        // O Supabase não deixa dar join em auth.users facilmente. 
        // Solução comum: salvar email no public.profiles ou usar Edge Function.
        // Como o authService original retornava tudo e no register eu passo email, vou assumir que vamos migrar para salvar email no profile também?
        // Ah, eu não adicionei email no profile no SQL setup. 
        // Vou buscar profiles e para MVP assumir que o "email" está acessivel via auth.getUser() apenas para o logado,
        // MAS para listar TODOS os usuários, o Admin precisa ver os emails.
        // Vou fazer um fetch em profiles e tentar pegar o email se possível, mas sem email no profile fica difícil.
        // AJUSTE: Vou alterar a tabela profiles para ter email também. É redundante mas facilita query.

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) return [];

        // HACK: Como não temos o email no profile e não podemos listar auth.users no client-side sem admin key (que não temos segura aqui),
        // Vamos retornar os profiles. O campo email vai ficar vazio ou "hidden" por enquanto se não estiver no profile.
        // Melhor: Adicionar coluna email no profiles.

        return (profiles || []).map(p => ({
            id: p.id,
            name: p.name,
            email: p.email || '', // Placeholder se não tiver coluna
            whatsapp: p.whatsapp,
            role: p.role,
            status: p.status,
            createdAt: p.created_at,
            lastContactedBy: p.last_contacted_by,
            checklistPhase: p.checklist_phase as 'LOCKED' | 'PHASE_1' | 'PHASE_2',
            checklistProgress: p.checklist_progress || [],
            checklistData: p.checklist_data || {}
        }));
    },

    deleteUser: async (userId: string) => {
        // Uso de RPC para deletar do auth.users (que faz cascade no profiles)
        const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
        if (error) {
            console.error('Erro ao deletar usuário:', error);
            throw new Error(error.message);
        }
    },

    updateUserRole: async (userId: string, newRole: UserRole) => {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    },

    updateUserStatus: async (userId: string, newStatus: UserStatus, responsibleName: string) => {
        const { error } = await supabase.from('profiles').update({
            status: newStatus,
            last_contacted_by: responsibleName
        }).eq('id', userId);

        if (error) {
            console.error('Erro ao atualizar status:', error);
            throw error;
        }
    },

    confirmFirstAccess: async (userId: string) => {
        // Atualiza apenas o status para ACTIVE, sem mexer em last_contacted_by (evita erro de RLS se houver restrição)
        const { error } = await supabase.from('profiles').update({
            status: 'ACTIVE'
        }).eq('id', userId);

        if (error) {
            console.error('Erro ao confirmar primeiro acesso:', error);
            throw error;
        }
    },

    updateUserData: async (userId: string, updates: Partial<User> & { password?: string }) => {
        const { email, password, ...profileUpdates } = updates as any;

        // 1. Se houver mudança de email, chamar RPC
        if (email) {
            const { error: emailError } = await supabase.rpc('update_user_email_by_admin', {
                target_user_id: userId,
                new_email: email
            });
            if (emailError) return { success: false, message: emailError.message };
        }

        // 2. Se houver mudança de senha, chamar RPC
        if (password) {
            const { error: passwordError } = await supabase.rpc('update_user_password_by_admin', {
                target_user_id: userId,
                new_password: password
            });
            if (passwordError) return { success: false, message: passwordError.message };
        }

        // 3. Atualizar outros dados do perfil
        if (Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', userId);

            if (error) return { success: false, message: error.message };
        }

        return { success: true };
    },

    // Gerenciamento de Custo de Vida
    getCostOfLiving: async (userId: string): Promise<CostOfLivingItem[]> => {
        const { data, error } = await supabase
            .from('cost_of_living')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar custo de vida:', error);
            return [];
        }
        return data || [];
    },

    saveCostOfLiving: async (userId: string, item: { id?: string; category: string; description: string; value: number; is_installment?: boolean; installments_count?: number }) => {
        const currentUser = await authService.getCurrentUser();

        // Se for Admin editando outro usuário
        if (currentUser?.role === 'ADMIN' && currentUser.id !== userId) {
            await authService.saveCostOfLivingByAdmin(userId, item);
            return true;
        }

        if (item.id) {
            const { error } = await supabase
                .from('cost_of_living')
                .update({
                    category: item.category,
                    description: item.description,
                    value: item.value,
                    is_installment: item.is_installment,
                    installments_count: item.installments_count
                })
                .eq('id', item.id);

            if (error) {
                console.error('Erro ao atualizar item de custo de vida:', error);
                throw error;
            }
        } else {
            const { error } = await supabase
                .from('cost_of_living')
                .insert({
                    user_id: userId,
                    category: item.category,
                    description: item.description,
                    value: item.value,
                    is_installment: item.is_installment,
                    installments_count: item.installments_count
                });

            if (error) {
                console.error('Erro ao salvar item de custo de vida:', error);
                throw error;
            }
        }
        return true;
    },

    deleteCostOfLivingItem: async (id: string, userId: string = '') => { // Add userId param for context check
        const currentUser = await authService.getCurrentUser();

        if (currentUser?.role === 'ADMIN') {
            await authService.deleteCostOfLivingByAdmin(id);
            return true;
        }

        const { error } = await supabase
            .from('cost_of_living')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar item de custo de vida:', error);
            throw error;
        }
        return true;
    },

    // Gerenciamento de Mapeamento de Dívidas
    getDebtMapping: async (userId: string): Promise<DebtMapItem[]> => {
        const { data, error } = await supabase
            .from('debt_mappings')
            .select('items')
            .eq('user_id', userId)
            .single();

        if (error || !data) return [];
        return data.items || [];
    },

    saveDebtMapping: async (userId: string, items: DebtMapItem[]) => {
        const { error } = await supabase
            .from('debt_mappings')
            .upsert({
                user_id: userId,
                items,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Erro ao salvar mapeamento de dívidas:', error);
            throw error;
        }
    },

    createUserByAdmin: async (userData: Omit<User, 'id' | 'createdAt' | 'status'> & { status?: UserStatus }) => {
        // Create a temporary client that DOES NOT persist the session
        // This prevents the Admin from being logged out when creating a new user
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data, error } = await tempClient.auth.signUp({
            email: userData.email,
            password: userData.password || 'mudar123',
            options: {
                data: {
                    name: userData.name,
                    whatsapp: userData.whatsapp,
                    role: userData.role || 'USER'
                }
            }
        });

        if (error) return { success: false, message: error.message };

        if (data.user) {
            // Se o admin passou um status específico (ex: ACTIVE), atualizamos agora
            if (userData.status && userData.status !== 'NEW') {
                // Usamos o client principal (Admin) para atualizar o profile criado via trigger
                // Mas o trigger roda assincrono? Sim.
                // Mas aqui já temos O ID.
                // Como somos Admin chamando, podemos atualizar o profile.
                await supabase.from('profiles').update({ status: userData.status }).eq('id', data.user.id);
            }

            const newUser: User = {
                id: data.user.id,
                name: userData.name,
                email: userData.email,
                whatsapp: userData.whatsapp,
                role: userData.role as UserRole,
                status: userData.status || 'NEW',
                createdAt: new Date().toISOString()
            };
            return { success: true, user: newUser };
        }

        return { success: false, message: 'Erro ao criar conta.' };
    },

    // Métodos ADMIN para bypass RLS
    getDiagnosticByAdmin: async (userId: string): Promise<FinancialData | null> => {
        const { data, error } = await supabase.rpc('get_diagnostic_by_admin', { target_user_id: userId });
        if (error || !data) return null;

        const financialData = data.data as FinancialData;
        financialData.lastUpdated = data.updated_at;
        return financialData;
    },

    getAnamnesisByAdmin: async (userId: string): Promise<Anamnesis | null> => {
        const { data, error } = await supabase.rpc('get_anamnesis_by_admin', { target_user_id: userId });
        if (error || !data) return null;

        // Mapear retorno do RPC (que é snake_case do banco) para camelCase do App
        return {
            id: data.id,
            userId: data.user_id,
            reason: data.reason,
            objectives: data.objectives,
            spendsAll: data.spends_all,
            emergencyFund: data.emergency_fund,
            investments: data.investments,
            investsMonthly: data.invests_monthly,
            retirementPlan: data.retirement_plan,
            independentDecisions: data.independent_decisions,
            financialScore: data.financial_score,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    getDebtMappingByAdmin: async (userId: string): Promise<DebtMapItem[]> => {
        const { data, error } = await supabase.rpc('get_debt_mapping_by_admin', { target_user_id: userId });
        if (error || !data || !data.items) return [];
        return data.items;
    },

    getCostOfLivingByAdmin: async (userId: string): Promise<CostOfLivingItem[]> => {
        const { data, error } = await supabase.rpc('get_cost_of_living_by_admin', { target_user_id: userId });
        if (error || !data) return [];

        // RPC retorna array de objetos, precisa mapear se campos diferirem (aqui parece igual)
        return data as CostOfLivingItem[];
    },

    saveDebtMappingByAdmin: async (userId: string, items: DebtMapItem[]) => {
        const { error } = await supabase.rpc('save_debt_mapping_by_admin', {
            target_user_id: userId,
            new_items: items
        });
        if (error) {
            console.error('Erro ao salvar dívidas por admin:', error);
            throw error;
        }
    },

    saveCostOfLivingByAdmin: async (userId: string, item: { id?: string; category: string; description: string; value: number; is_installment?: boolean; installments_count?: number }) => {
        const { error } = await supabase.rpc('save_cost_of_living_by_admin', {
            target_user_id: userId,
            item_id: item.id || null, // Passar explicitamente null se undefined
            category: item.category,
            description: item.description,
            value: item.value,
            is_installment: item.is_installment,
            installments_count: item.installments_count
        });
        if (error) {
            console.error('Erro ao salvar custo de vida por admin:', error);
            throw error;
        }
    },

    deleteCostOfLivingByAdmin: async (itemId: string) => {
        const { error } = await supabase.rpc('delete_cost_of_living_by_admin', { target_item_id: itemId });
        if (error) {
            console.error('Erro ao deletar custo de vida por admin:', error);
            throw error;
        }
    },

    saveAnamnesisByAdmin: async (userId: string, data: Omit<Anamnesis, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        const { error } = await supabase.rpc('save_anamnesis_by_admin', {
            target_user_id: userId,
            reason: data.reason,
            objectives: data.objectives,
            spends_all: data.spendsAll,
            emergency_fund: data.emergencyFund,
            investments: data.investments,
            invests_monthly: data.investsMonthly,
            retirement_plan: data.retirementPlan,
            independent_decisions: data.independentDecisions,
            financial_score: data.financialScore
        });

        if (error) {
            console.error('Erro ao salvar anamnese por admin:', error);
            throw error;
        }
    },

    saveDiagnosticByAdmin: async (userId: string, data: FinancialData) => {
        const { error } = await supabase.rpc('save_diagnostic_by_admin', {
            target_user_id: userId,
            new_data: data
        });

        if (error) {
            console.error('Erro ao salvar diagnóstico por admin:', error);
            throw error;
        }
    },
    // --- User Intake Form (Ficha Individual) ---
    getUserIntake: async (userId: string) => {
        const { data, error } = await supabase.rpc('get_user_intake', { target_user_id: userId });
        if (error) {
            console.error('Error fetching user intake:', error);
            return null;
        }
        return data as any;
    },

    saveUserIntake: async (userId: string, intakeData: { main_problem: string; resolution_attempts: string; details?: any; personal_info?: any }) => {
        const { data, error } = await supabase.rpc('save_user_intake', {
            target_user_id: userId,
            p_main_problem: intakeData.main_problem,
            p_resolution_attempts: intakeData.resolution_attempts,
            p_details: {
                ...(intakeData.details || {}),
                personal_info: intakeData.personal_info
            }
        });

        if (error) {
            console.error('Error saving user intake:', error);
            return { success: false, message: error.message };
        }
        return { success: true, data };
    },

    // --- Mentorship Module ---
    getMentorshipState: async (userId: string): Promise<MentorshipState> => {
        const currentUser = await authService.getCurrentUser();
        let meetings: any[] = [];
        let expenses: any[] = [];
        let error = null;

        // Se for Admin acessando outro usuário
        if (currentUser?.role === 'ADMIN' && currentUser.id !== userId) {
            const { data, error: rpcError } = await supabase.rpc('get_mentorship_state_by_admin', { target_user_id: userId });

            if (rpcError) {
                console.error("RPC Error fetching mentorship state:", rpcError);
                return { meetings: [], nonRecurringExpenses: [] };
            }
            if (data) {
                // If the prompt says it returns JSONB, then data.meetings and data.nonRecurringExpenses are properties of the JSON
                // However, RPC return type `JSONB` might need casting as `any` in TypeScript for `data`
                const typedData = data as any;
                meetings = typedData.meetings || [];
                expenses = typedData.nonRecurringExpenses || [];
            }
        } else {
            // Standard User Fetch
            const { data: mData, error: mError } = await supabase
                .from('mentorship_meetings')
                .select('*')
                .eq('user_id', userId)
                .order('meeting_id', { ascending: true });

            if (mError) {
                console.error('Error fetching mentorship meetings:', mError);
                return { meetings: [], nonRecurringExpenses: [] };
            }
            meetings = mData || [];

            const { data: eData, error: eError } = await supabase
                .from('non_recurring_expenses')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (eError) {
                console.error('Error fetching non-recurring expenses:', eError);
                return { meetings: [], nonRecurringExpenses: [] };
            }
            expenses = eData || [];
        }

        const mappedMeetings = (meetings || []).map(m => ({
            userId: m.user_id,
            meetingId: m.meeting_id, // Postgres returns snake_case by default? Yes, waiting for confirmation on exact column names from previous step. 
            // In apply_migration I used user_id, meeting_id, started_at, completed_at
            // Supabase client might return them as is.
            status: m.status,
            data: m.data,
            startedAt: m.started_at,
            completedAt: m.completed_at
        }));

        const mappedExpenses = (expenses || []).map(e => ({
            id: e.id,
            userId: e.user_id,
            category: e.category,
            description: e.description,
            value: e.value,
            frequency: e.frequency,
            createdAt: e.created_at
        }));

        return {
            meetings: mappedMeetings as MentorshipMeeting[],
            nonRecurringExpenses: mappedExpenses as NonRecurringExpenseItem[]
        };
    },



    updateMeetingStatus: async (userId: string, meetingId: number, status: 'locked' | 'unlocked' | 'completed') => {
        const currentUser = await authService.getCurrentUser();

        // Se for Admin editando outro usuário
        if (currentUser?.role === 'ADMIN' && currentUser.id !== userId) {
            const { error } = await supabase.rpc('update_meeting_status_by_admin', {
                target_user_id: userId,
                target_meeting_id: meetingId,
                new_status: status
            });
            if (error) throw error;
        } else {
            // Usuário normal
            const { error } = await supabase
                .from('mentorship_meetings')
                .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
                .eq('user_id', userId)
                .eq('meeting_id', meetingId);

            if (error) throw error;
        }
    },

    saveMeetingData: async (userId: string, meetingId: number, data: any) => {
        const currentUser = await authService.getCurrentUser();

        // Se for Admin editando outro usuário
        if (currentUser?.role === 'ADMIN' && currentUser.id !== userId) {

            const { error } = await supabase.rpc('upsert_mentorship_meeting_by_admin', {
                target_user_id: userId,
                target_meeting_id: meetingId,
                new_data: data
            }); // status default to unlocked/unchanged inside RPC

            if (error) {
                alert(`ERRO AO SALVAR (ADMIN): ${error.message}`);
                throw error;
            }
        } else {
            // Usuário normal ou Admin editando a si mesmo
            const { error } = await supabase
                .from('mentorship_meetings')
                .upsert({
                    user_id: userId,
                    meeting_id: meetingId,
                    data
                }, { onConflict: 'user_id, meeting_id' });

            if (error) throw error;
        }
    },

    saveNonRecurringExpense: async (userId: string, item: Omit<NonRecurringExpenseItem, 'id' | 'createdAt' | 'userId'> & { id?: string }) => {
        const currentUser = await authService.getCurrentUser();

        // Se for Admin editando outro usuário
        if (currentUser?.role === 'ADMIN' && currentUser.id !== userId) {
            const { error } = await supabase.rpc('upsert_non_recurring_expense_by_admin', {
                target_user_id: userId,
                expense_category: item.category,
                expense_description: item.description,
                expense_value: item.value,
                expense_frequency: item.frequency,
                expense_id: item.id || null
            });
            if (error) throw error;
        } else {
            // Usuário normal
            if (item.id) {
                const { error } = await supabase
                    .from('non_recurring_expenses')
                    .update({
                        category: item.category,
                        description: item.description,
                        value: item.value,
                        frequency: item.frequency
                    })
                    .eq('id', item.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('non_recurring_expenses')
                    .insert({
                        user_id: userId,
                        category: item.category,
                        description: item.description,
                        value: item.value,
                        frequency: item.frequency
                    });
                if (error) throw error;
            }
        }
    },

    deleteNonRecurringExpense: async (id: string, userId: string = '') => { // Added userId optional param to check context if needed, but for delete by ID we need to know ownership or use Admin RPC
        const currentUser = await authService.getCurrentUser();

        if (currentUser?.role === 'ADMIN') {
            // Admin delete by RPC
            const { error } = await supabase.rpc('delete_non_recurring_expense_by_admin', { target_expense_id: id });
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('non_recurring_expenses')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    }

};
