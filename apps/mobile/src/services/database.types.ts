export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      claim_events: {
        Row: {
          actor_user_id: string | null
          claim_id: string
          created_at: string
          event_type: string
          id: string
        }
        Insert: {
          actor_user_id?: string | null
          claim_id: string
          created_at?: string
          event_type: string
          id?: string
        }
        Update: {
          actor_user_id?: string | null
          claim_id?: string
          created_at?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_payments: {
        Row: {
          amount_minor: number
          claim_id: string
          confirmation_status: string
          confirmed_at: string | null
          created_at: string
          currency_code: string
          id: string
          note: string | null
          payment_date: string
          recorded_by: string
          rejected_at: string | null
        }
        Insert: {
          amount_minor: number
          claim_id: string
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          currency_code: string
          id?: string
          note?: string | null
          payment_date: string
          recorded_by: string
          rejected_at?: string | null
        }
        Update: {
          amount_minor?: number
          claim_id?: string
          confirmation_status?: string
          confirmed_at?: string | null
          created_at?: string
          currency_code?: string
          id?: string
          note?: string | null
          payment_date?: string
          recorded_by?: string
          rejected_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_reminders: {
        Row: {
          claim_id: string
          created_at: string
          disabled_at: string | null
          id: string
          note: string | null
          remind_at: string
          user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          note?: string | null
          remind_at: string
          user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          disabled_at?: string | null
          id?: string
          note?: string | null
          remind_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_reminders_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          amount_minor: number
          archived_at: string | null
          claim_date: string
          context_id: string | null
          counterparty_id: string
          created_at: string
          creator_user_id: string
          currency_code: string
          direction: string
          due_date: string | null
          group_id: string | null
          id: string
          purpose: string | null
          shared_with_counterparty: boolean
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          archived_at?: string | null
          claim_date: string
          context_id?: string | null
          counterparty_id: string
          created_at?: string
          creator_user_id: string
          currency_code: string
          direction: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          purpose?: string | null
          shared_with_counterparty?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          archived_at?: string | null
          claim_date?: string
          context_id?: string | null
          counterparty_id?: string
          created_at?: string
          creator_user_id?: string
          currency_code?: string
          direction?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          purpose?: string | null
          shared_with_counterparty?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      context_members: {
        Row: {
          context_id: string
          default_included: boolean
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          context_id: string
          default_included?: boolean
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          context_id?: string
          default_included?: boolean
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_members_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_plan_participants: {
        Row: {
          cost_plan_id: string
          counterparty_id: string
          created_at: string
          id: string
          joined_at_period_index: number
          left_at_period_index: number | null
          share_type: string
          share_value_minor: number | null
        }
        Insert: {
          cost_plan_id: string
          counterparty_id: string
          created_at?: string
          id?: string
          joined_at_period_index: number
          left_at_period_index?: number | null
          share_type: string
          share_value_minor?: number | null
        }
        Update: {
          cost_plan_id?: string
          counterparty_id?: string
          created_at?: string
          id?: string
          joined_at_period_index?: number
          left_at_period_index?: number | null
          share_type?: string
          share_value_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_plan_participants_cost_plan_id_fkey"
            columns: ["cost_plan_id"]
            isOneToOne: false
            referencedRelation: "cost_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_plan_participants_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_plans: {
        Row: {
          amount_minor: number
          anchor_date: string
          archived_at: string | null
          context_id: string | null
          created_at: string
          created_by: string
          currency_code: string
          group_id: string
          id: string
          interval_days: number | null
          interval_kind: string
          name: string
          prepaid: boolean
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          anchor_date: string
          archived_at?: string | null
          context_id?: string | null
          created_at?: string
          created_by: string
          currency_code: string
          group_id: string
          id?: string
          interval_days?: number | null
          interval_kind: string
          name: string
          prepaid?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          anchor_date?: string
          archived_at?: string | null
          context_id?: string | null
          created_at?: string
          created_by?: string
          currency_code?: string
          group_id?: string
          id?: string
          interval_days?: number | null
          interval_kind?: string
          name?: string
          prepaid?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_plans_context_belongs_to_group"
            columns: ["context_id", "group_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "cost_plans_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          archived_at: string | null
          created_at: string
          display_name: string
          id: string
          kind: string
          linked_user_id: string | null
          normalized_name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_name: string
          id?: string
          kind: string
          linked_user_id?: string | null
          normalized_name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          kind?: string
          linked_user_id?: string | null
          normalized_name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparties_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparty_aliases: {
        Row: {
          alias: string
          counterparty_id: string
          created_at: string
          id: string
          normalized_alias: string
        }
        Insert: {
          alias: string
          counterparty_id: string
          created_at?: string
          id?: string
          normalized_alias: string
        }
        Update: {
          alias?: string
          counterparty_id?: string
          created_at?: string
          id?: string
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparty_aliases_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          amount_minor: number
          currency_code: string
          expense_id: string
          id: string
          share_type: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          currency_code: string
          expense_id: string
          id?: string
          share_type: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          currency_code?: string
          expense_id?: string
          id?: string
          share_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_currency_code_fkey"
            columns: ["expense_id", "currency_code"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "currency_code"]
          },
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_minor: number
          context_id: string
          created_at: string
          created_by: string
          currency_code: string
          deleted_at: string | null
          expense_date: string
          group_id: string
          id: string
          note: string | null
          paid_by_user_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          context_id: string
          created_at?: string
          created_by: string
          currency_code: string
          deleted_at?: string | null
          expense_date: string
          group_id: string
          id?: string
          note?: string | null
          paid_by_user_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          context_id?: string
          created_at?: string
          created_by?: string
          currency_code?: string
          deleted_at?: string | null
          expense_date?: string
          group_id?: string
          id?: string
          note?: string | null
          paid_by_user_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_context_id_group_id_fkey"
            columns: ["context_id", "group_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_user_id_fkey"
            columns: ["paid_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_connections: {
        Row: {
          accepted_at: string | null
          addressee_user_id: string
          created_at: string
          id: string
          requester_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_user_id: string
          created_at?: string
          id?: string
          requester_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_user_id?: string
          created_at?: string
          id?: string
          requester_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_connections_addressee_user_id_fkey"
            columns: ["addressee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_connections_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_contexts: {
        Row: {
          archived_at: string | null
          created_at: string
          default_currency_code: string | null
          end_date: string | null
          group_id: string
          id: string
          name: string
          start_date: string | null
          type: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          default_currency_code?: string | null
          end_date?: string | null
          group_id: string
          id?: string
          name: string
          start_date?: string | null
          type: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          default_currency_code?: string | null
          end_date?: string | null
          group_id?: string
          id?: string
          name?: string
          start_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_contexts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          default_currency_code: string
          id: string
          name: string
          type: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          default_currency_code: string
          id?: string
          name: string
          type: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          default_currency_code?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          context_id: string | null
          created_at: string
          group_id: string | null
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_availability: {
        Row: {
          affects_default_selection: boolean
          context_id: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          mode: string
          note: string | null
          unavailable_from: string
          unavailable_until: string | null
          user_id: string
        }
        Insert: {
          affects_default_selection?: boolean
          context_id?: string | null
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          mode: string
          note?: string | null
          unavailable_from: string
          unavailable_until?: string | null
          user_id: string
        }
        Update: {
          affects_default_selection?: boolean
          context_id?: string | null
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          mode?: string
          note?: string | null
          unavailable_from?: string
          unavailable_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_availability_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_availability_context_id_group_id_fkey"
            columns: ["context_id", "group_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "member_availability_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_availability_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_actions: {
        Row: {
          amount_minor: number
          confirmed_by_payee_at: string | null
          context_id: string | null
          created_at: string
          currency_code: string
          group_id: string
          id: string
          marked_paid_at: string | null
          payee_id: string
          payer_id: string
          rejected_at: string | null
          status: string
        }
        Insert: {
          amount_minor: number
          confirmed_by_payee_at?: string | null
          context_id?: string | null
          created_at?: string
          currency_code: string
          group_id: string
          id?: string
          marked_paid_at?: string | null
          payee_id: string
          payer_id: string
          rejected_at?: string | null
          status?: string
        }
        Update: {
          amount_minor?: number
          confirmed_by_payee_at?: string | null
          context_id?: string | null
          created_at?: string
          currency_code?: string
          group_id?: string
          id?: string
          marked_paid_at?: string | null
          payee_id?: string
          payer_id?: string
          rejected_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_actions_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_actions_context_id_group_id_fkey"
            columns: ["context_id", "group_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "payment_actions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_actions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_actions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          actor_user_id: string | null
          context_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          group_id: string
          id: string
        }
        Insert: {
          actor_user_id?: string | null
          context_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          group_id: string
          id?: string
        }
        Update: {
          actor_user_id?: string | null
          context_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "group_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_claim_creator: { Args: { target_claim_id: string }; Returns: boolean }
      is_claim_participant: {
        Args: { target_claim_id: string }
        Returns: boolean
      }
      is_claim_status_transition_allowed: {
        Args: { from_status: string; to_status: string }
        Returns: boolean
      }
      is_context_group_member: {
        Args: { target_context_id: string }
        Returns: boolean
      }
      is_cost_plan_group_member: {
        Args: { target_plan_id: string }
        Returns: boolean
      }
      is_counterparty_owner: {
        Args: { target_counterparty_id: string }
        Returns: boolean
      }
      is_expense_group_member: {
        Args: { target_expense_id: string }
        Returns: boolean
      }
      is_group_admin: { Args: { target_group_id: string }; Returns: boolean }
      is_group_creator: { Args: { target_group_id: string }; Returns: boolean }
      is_group_member: { Args: { target_group_id: string }; Returns: boolean }
      is_linked_counterparty_user: {
        Args: { target_counterparty_id: string }
        Returns: boolean
      }
      shares_active_group_with: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

