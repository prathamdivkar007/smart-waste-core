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
  public: {
    Tables: {
      alerts: {
        Row: {
          bin_id: string | null
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
          vehicle_id: string | null
        }
        Insert: {
          bin_id?: string | null
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          type: Database["public"]["Enums"]["alert_type"]
          vehicle_id?: string | null
        }
        Update: {
          bin_id?: string | null
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          type?: Database["public"]["Enums"]["alert_type"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          area_code: string
          created_at: string
          id: string
          name: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          area_code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          area_code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      bin_telemetry: {
        Row: {
          battery_voltage: number | null
          bin_code: string
          bin_id: string
          created_at: string
          fill_level: number
          id: number
          metal_detected: boolean
          moisture_level: number | null
          timestamp: string
        }
        Insert: {
          battery_voltage?: number | null
          bin_code: string
          bin_id: string
          created_at?: string
          fill_level: number
          id?: number
          metal_detected?: boolean
          moisture_level?: number | null
          timestamp?: string
        }
        Update: {
          battery_voltage?: number | null
          bin_code?: string
          bin_id?: string
          created_at?: string
          fill_level?: number
          id?: number
          metal_detected?: boolean
          moisture_level?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "bin_telemetry_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
        ]
      }
      bins: {
        Row: {
          area_id: string | null
          assigned_vehicle_id: string | null
          battery_voltage: number | null
          bin_id: string
          created_at: string
          fill_level: number
          id: string
          label: string | null
          last_collection_at: string | null
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          metal_detected: boolean
          moisture_level: number | null
          status: Database["public"]["Enums"]["bin_status"]
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          area_id?: string | null
          assigned_vehicle_id?: string | null
          battery_voltage?: number | null
          bin_id: string
          created_at?: string
          fill_level?: number
          id?: string
          label?: string | null
          last_collection_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metal_detected?: boolean
          moisture_level?: number | null
          status?: Database["public"]["Enums"]["bin_status"]
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          area_id?: string | null
          assigned_vehicle_id?: string | null
          battery_voltage?: number | null
          bin_id?: string
          created_at?: string
          fill_level?: number
          id?: string
          label?: string | null
          last_collection_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          metal_detected?: boolean
          moisture_level?: number | null
          status?: Database["public"]["Enums"]["bin_status"]
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bins_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bins_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bins_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          bin_code: string | null
          bin_id: string | null
          collection_time: string
          confirmation_method: string
          created_at: string
          driver_name: string | null
          id: string
          new_status: Database["public"]["Enums"]["bin_status"] | null
          notes: string | null
          previous_status: Database["public"]["Enums"]["bin_status"] | null
          vehicle_code: string | null
          vehicle_id: string | null
        }
        Insert: {
          bin_code?: string | null
          bin_id?: string | null
          collection_time?: string
          confirmation_method?: string
          created_at?: string
          driver_name?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["bin_status"] | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["bin_status"] | null
          vehicle_code?: string | null
          vehicle_id?: string | null
        }
        Update: {
          bin_code?: string | null
          bin_id?: string | null
          collection_time?: string
          confirmation_method?: string
          created_at?: string
          driver_name?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["bin_status"] | null
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["bin_status"] | null
          vehicle_code?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          active: boolean
          bin_id: string | null
          created_at: string
          device_id: string
          device_secret_hash: string
          device_type: Database["public"]["Enums"]["device_type"]
          firmware_version: string | null
          id: string
          last_seen_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          bin_id?: string | null
          created_at?: string
          device_id: string
          device_secret_hash: string
          device_type: Database["public"]["Enums"]["device_type"]
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          bin_id?: string | null
          created_at?: string
          device_id?: string
          device_secret_hash?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          firmware_version?: string | null
          id?: string
          last_seen_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_locations: {
        Row: {
          created_at: string
          heading: number | null
          id: number
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
          vehicle_code: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          heading?: number | null
          id?: number
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
          vehicle_code: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          heading?: number | null
          id?: number
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
          vehicle_code?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_bin_id: string | null
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          driver_user_id: string | null
          heading: number | null
          id: string
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          speed: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_bin_id?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          heading?: number | null
          id?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_bin_id?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          driver_user_id?: string | null
          heading?: number | null
          id?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_bin_fk"
            columns: ["assigned_bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          ward_code: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          ward_code: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          ward_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_severity: "INFO" | "WARNING" | "CRITICAL"
      alert_status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"
      alert_type:
        | "BIN_FULL"
        | "BIN_OFFLINE"
        | "VEHICLE_OFFLINE"
        | "GPS_OFFLINE"
        | "SENSOR_ERROR"
        | "COLLECTION_OVERDUE"
      app_role: "ADMIN" | "SUPERVISOR" | "DRIVER"
      bin_status: "NORMAL" | "NEAR_FULL" | "FULL" | "OFFLINE"
      device_type: "BIN" | "VEHICLE"
      vehicle_status: "AVAILABLE" | "EN_ROUTE" | "COLLECTING" | "OFFLINE"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["INFO", "WARNING", "CRITICAL"],
      alert_status: ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
      alert_type: [
        "BIN_FULL",
        "BIN_OFFLINE",
        "VEHICLE_OFFLINE",
        "GPS_OFFLINE",
        "SENSOR_ERROR",
        "COLLECTION_OVERDUE",
      ],
      app_role: ["ADMIN", "SUPERVISOR", "DRIVER"],
      bin_status: ["NORMAL", "NEAR_FULL", "FULL", "OFFLINE"],
      device_type: ["BIN", "VEHICLE"],
      vehicle_status: ["AVAILABLE", "EN_ROUTE", "COLLECTING", "OFFLINE"],
    },
  },
} as const
