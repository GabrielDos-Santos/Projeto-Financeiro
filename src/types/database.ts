export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          initial_balance_cents: number
          is_archived: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          initial_balance_cents?: number
          is_archived?: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          initial_balance_cents?: number
          is_archived?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_threshold: number
          amount_cents: number
          category_id: string
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number
          amount_cents: number
          category_id: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold?: number
          amount_cents?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoice_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          invoice_id: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          invoice_id: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          invoice_id?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_totals"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_card_invoice_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoice_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoices: {
        Row: {
          closing_date: string
          created_at: string
          credit_card_id: string
          due_date: string
          id: string
          paid_at: string | null
          payment_transaction_id: string | null
          reference_month: string
          status: Database["public"]["Enums"]["invoice_status"]
          user_id: string
        }
        Insert: {
          closing_date: string
          created_at?: string
          credit_card_id: string
          due_date: string
          id?: string
          paid_at?: string | null
          payment_transaction_id?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id: string
        }
        Update: {
          closing_date?: string
          created_at?: string
          credit_card_id?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_transaction_id?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_transaction_fk"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank: string | null
          closing_day: number
          color: string | null
          created_at: string
          due_day: number
          icon: string | null
          id: string
          invoice_name_by_due_month: boolean
          is_archived: boolean
          limit_cents: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank?: string | null
          closing_day: number
          color?: string | null
          created_at?: string
          due_day: number
          icon?: string | null
          id?: string
          invoice_name_by_due_month?: boolean
          is_archived?: boolean
          limit_cents: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank?: string | null
          closing_day?: number
          color?: string | null
          created_at?: string
          due_day?: number
          icon?: string | null
          id?: string
          invoice_name_by_due_month?: boolean
          is_archived?: boolean
          limit_cents?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          created_at: string
          current_amount_cents: number
          description: string | null
          icon: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["goal_status"]
          target_amount_cents: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_amount_cents?: number
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount_cents: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          current_amount_cents?: number
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount_cents?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["household_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          household_id: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["household_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["household_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["household_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_shared_accounts: {
        Row: {
          account_id: string
          created_at: string
          household_id: string
          id: string
          shared_by: string
        }
        Insert: {
          account_id: string
          created_at?: string
          household_id: string
          id?: string
          shared_by: string
        }
        Update: {
          account_id?: string
          created_at?: string
          household_id?: string
          id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_shared_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_shared_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "household_shared_accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_shared_accounts_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          account_id: string | null
          created_at: string
          credit_card_id: string | null
          file_name: string
          id: string
          kind: string
          reference_month: string | null
          row_count: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          file_name: string
          id?: string
          kind: string
          reference_month?: string | null
          row_count: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          file_name?: string
          id?: string
          kind?: string
          reference_month?: string | null
          row_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "import_batches_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          contract_date: string
          created_at: string
          disbursement_transaction_id: string | null
          id: string
          installments_total: number
          interest_rate: number | null
          lender: string | null
          name: string
          notes: string | null
          parent_transaction_id: string
          principal_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_date: string
          created_at?: string
          disbursement_transaction_id?: string | null
          id?: string
          installments_total: number
          interest_rate?: number | null
          lender?: string | null
          name: string
          notes?: string | null
          parent_transaction_id: string
          principal_cents: number
          total_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_date?: string
          created_at?: string
          disbursement_transaction_id?: string | null
          id?: string
          installments_total?: number
          interest_rate?: number | null
          lender?: string | null
          name?: string
          notes?: string | null
          parent_transaction_id?: string
          principal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_disbursement_transaction_id_fkey"
            columns: ["disbursement_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          hit_at: string
          id: number
          key: string
        }
        Insert: {
          hit_at?: string
          id?: never
          key: string
        }
        Update: {
          hit_at?: string
          id?: never
          key?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          amount_cents: number
          category_id: string
          created_at: string
          credit_card_id: string | null
          description: string
          end_date: string | null
          exclude_from_projection: boolean
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          id: string
          interval_count: number
          is_active: boolean
          next_run_date: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_cents: number
          category_id: string
          created_at?: string
          credit_card_id?: string | null
          description: string
          end_date?: string | null
          exclude_from_projection?: boolean
          frequency: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          interval_count?: number
          is_active?: boolean
          next_run_date: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount_cents?: number
          category_id?: string
          created_at?: string
          credit_card_id?: string | null
          description?: string
          end_date?: string | null
          exclude_from_projection?: boolean
          frequency?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          interval_count?: number
          is_active?: boolean
          next_run_date?: string
          start_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          currency: string
          locale: string
          notify_budget_alerts: boolean
          notify_invoice_due: boolean
          notify_loan_due: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          currency?: string
          locale?: string
          notify_budget_alerts?: boolean
          notify_invoice_due?: boolean
          notify_loan_due?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          currency?: string
          locale?: string
          notify_budget_alerts?: boolean
          notify_invoice_due?: boolean
          notify_loan_due?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_installments: {
        Row: {
          affects_balance: boolean
          amount_cents: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          invoice_id: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string
          user_id: string
        }
        Insert: {
          affects_balance?: boolean
          amount_cents: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          invoice_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string
          user_id: string
        }
        Update: {
          affects_balance?: boolean
          amount_cents?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          invoice_id?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_totals"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "transaction_installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_installments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          affects_balance: boolean
          amount_cents: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          date: string
          description: string
          id: string
          import_batch_id: string | null
          import_hash: string | null
          installments_total: number | null
          invoice_id: string | null
          is_installment_parent: boolean
          notes: string | null
          paid_at: string | null
          recurring_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transfer_direction:
            | Database["public"]["Enums"]["transfer_direction"]
            | null
          transfer_group_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          affects_balance?: boolean
          amount_cents: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date: string
          description: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          installments_total?: number | null
          invoice_id?: string | null
          is_installment_parent?: boolean
          notes?: string | null
          paid_at?: string | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transfer_direction?:
            | Database["public"]["Enums"]["transfer_direction"]
            | null
          transfer_group_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          affects_balance?: boolean
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          date?: string
          description?: string
          id?: string
          import_batch_id?: string | null
          import_hash?: string | null
          installments_total?: number | null
          invoice_id?: string | null
          is_installment_parent?: boolean
          notes?: string | null
          paid_at?: string | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transfer_direction?:
            | Database["public"]["Enums"]["transfer_direction"]
            | null
          transfer_group_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_totals"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_account_balances: {
        Row: {
          account_id: string | null
          balance_cents: number | null
          color: string | null
          icon: string | null
          initial_balance_cents: number | null
          is_archived: boolean | null
          name: string | null
          type: Database["public"]["Enums"]["account_type"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_usage: {
        Row: {
          alert_reached: boolean | null
          alert_threshold: number | null
          amount_cents: number | null
          budget_id: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          month: string | null
          spent_cents: number | null
          usage_ratio: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_entries: {
        Row: {
          account_id: string | null
          affects_balance: boolean | null
          amount_cents: number | null
          category_id: string | null
          created_at: string | null
          credit_card_id: string | null
          date: string | null
          description: string | null
          entry_kind: string | null
          id: string | null
          installment_number: number | null
          invoice_id: string | null
          notes: string | null
          recurring_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          transaction_id: string | null
          transfer_direction:
            | Database["public"]["Enums"]["transfer_direction"]
            | null
          transfer_group_id: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          user_id: string | null
        }
        Relationships: []
      }
      v_invoice_totals: {
        Row: {
          closing_date: string | null
          credit_card_id: string | null
          due_date: string | null
          invoice_id: string | null
          items_count: number | null
          paid_at: string | null
          paid_cents: number | null
          payment_transaction_id: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          total_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_transaction_fk"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_summary: {
        Row: {
          expense_paid_cents: number | null
          expense_pending_cents: number | null
          income_paid_cents: number | null
          income_pending_cents: number | null
          month: string | null
          net_paid_cents: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_household_invite: {
        Args: { p_token_hash: string }
        Returns: string
      }
      account_owned_by_member_of: {
        Args: { p_account: string; p_household: string }
        Returns: boolean
      }
      account_shared_with_me: { Args: { p_account: string }; Returns: boolean }
      advance_occurrence: {
        Args: {
          p_frequency: Database["public"]["Enums"]["recurrence_freq"]
          p_interval: number
          p_k: number
          p_start: string
        }
        Returns: string
      }
      check_rate_limit: {
        Args: { p_key: string; p_max_hits: number; p_window: string }
        Returns: boolean
      }
      compute_invoice_period: {
        Args: { p_closing_day: number; p_date: string; p_due_day: number }
        Returns: {
          closing_date: string
          due_date: string
          reference_month: string
        }[]
      }
      create_default_categories: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_household: { Args: { p_name: string }; Returns: string }
      generate_recurring_transactions: { Args: never; Returns: number }
      get_card_available_limit: {
        Args: { p_credit_card_id: string }
        Returns: number
      }
      get_household_category_breakdown: {
        Args: { p_household: string; p_month: string }
        Returns: {
          amount_cents: number
          category_color: string
          category_name: string
        }[]
      }
      get_household_monthly_series: {
        Args: { p_household: string; p_months: number }
        Returns: {
          expense_paid_cents: number
          income_paid_cents: number
          month: string
        }[]
      }
      get_household_monthly_summary: {
        Args: { p_household: string; p_month: string }
        Returns: {
          expense_paid_cents: number
          expense_pending_cents: number
          income_paid_cents: number
          income_pending_cents: number
        }[]
      }
      get_invite_details: {
        Args: { p_token_hash: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          household_id: string
          household_name: string
          role: Database["public"]["Enums"]["household_role"]
        }[]
      }
      get_or_create_invoice: {
        Args: { p_credit_card_id: string; p_purchase_date: string }
        Returns: string
      }
      is_admin_of: { Args: { p_household: string }; Returns: boolean }
      is_admin_over: { Args: { p_user: string }; Returns: boolean }
      is_member_of: { Args: { p_household: string }; Returns: boolean }
      shares_household_with: { Args: { p_user: string }; Returns: boolean }
    }
    Enums: {
      account_type: "bank" | "wallet" | "cash" | "investment" | "digital"
      category_type: "income" | "expense"
      goal_status: "active" | "completed" | "archived"
      household_role: "admin" | "member"
      invoice_status: "open" | "closed" | "paid"
      member_status: "active" | "removed"
      notification_type:
        | "budget_alert"
        | "invoice_due"
        | "goal_reached"
        | "system"
        | "loan_due"
      recurrence_freq: "daily" | "weekly" | "monthly" | "yearly"
      transaction_status: "paid" | "pending" | "cancelled"
      transaction_type: "income" | "expense" | "transfer"
      transfer_direction: "in" | "out"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["bank", "wallet", "cash", "investment", "digital"],
      category_type: ["income", "expense"],
      goal_status: ["active", "completed", "archived"],
      household_role: ["admin", "member"],
      invoice_status: ["open", "closed", "paid"],
      member_status: ["active", "removed"],
      notification_type: [
        "budget_alert",
        "invoice_due",
        "goal_reached",
        "system",
        "loan_due",
      ],
      recurrence_freq: ["daily", "weekly", "monthly", "yearly"],
      transaction_status: ["paid", "pending", "cancelled"],
      transaction_type: ["income", "expense", "transfer"],
      transfer_direction: ["in", "out"],
    },
  },
} as const
