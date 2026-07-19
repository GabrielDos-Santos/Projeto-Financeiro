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
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          currency?: string
          locale?: string
          notify_budget_alerts?: boolean
          notify_invoice_due?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          currency?: string
          locale?: string
          notify_budget_alerts?: boolean
          notify_invoice_due?: boolean
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
      generate_recurring_transactions: { Args: never; Returns: number }
      get_card_available_limit: {
        Args: { p_credit_card_id: string }
        Returns: number
      }
      get_or_create_invoice: {
        Args: { p_credit_card_id: string; p_purchase_date: string }
        Returns: string
      }
    }
    Enums: {
      account_type: "bank" | "wallet" | "cash" | "investment" | "digital"
      category_type: "income" | "expense"
      goal_status: "active" | "completed" | "archived"
      invoice_status: "open" | "closed" | "paid"
      notification_type:
        | "budget_alert"
        | "invoice_due"
        | "goal_reached"
        | "system"
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
      invoice_status: ["open", "closed", "paid"],
      notification_type: [
        "budget_alert",
        "invoice_due",
        "goal_reached",
        "system",
      ],
      recurrence_freq: ["daily", "weekly", "monthly", "yearly"],
      transaction_status: ["paid", "pending", "cancelled"],
      transaction_type: ["income", "expense", "transfer"],
      transfer_direction: ["in", "out"],
    },
  },
} as const
