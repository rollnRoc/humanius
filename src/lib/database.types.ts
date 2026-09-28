export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          address: string
          tax_number: string
          sgk_sicil_no: string
          phone: string
          email: string
          city: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string
          tax_number?: string
          sgk_sicil_no?: string
          phone?: string
          email?: string
          city?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          tax_number?: string
          sgk_sicil_no?: string
          phone?: string
          email?: string
          city?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          company_id: string | null
          role: 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          company_id?: string | null
          role?: 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          company_id?: string | null
          role?: 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      employees: {
        Row: {
          id: string
          company_id: string
          name: string
          tc_no: string
          sicil_no: string
          is_yeri_sgk_sicil_no?: string | null
          department: string
          position: string
          level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager'
          salary: number
          status: 'active' | 'onLeave' | 'inactive'
          phone: string
          email: string
          join_date: string
          address: string
          avatar_url: string | null
          skills: string[]
          medeni_durum: 'bekar' | 'evli'
          cocuk_sayisi: number
          engelli_durumu: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          employee_type: 'normal' | 'emekli'
          approval_passcode: string | null
          approval_signature: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          tc_no?: string
          sicil_no?: string
          is_yeri_sgk_sicil_no?: string | null
          department: string
          position: string
          level?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager'
          salary?: number
          status?: 'active' | 'onLeave' | 'inactive'
          phone?: string
          email?: string
          join_date?: string
          address?: string
          avatar_url?: string | null
          skills?: string[]
          medeni_durum?: 'bekar' | 'evli'
          cocuk_sayisi?: number
          engelli_durumu?: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          employee_type?: 'normal' | 'emekli'
          approval_passcode?: string | null
          approval_signature?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          tc_no?: string
          sicil_no?: string
          is_yeri_sgk_sicil_no?: string | null
          department?: string
          position?: string
          level?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager'
          salary?: number
          status?: 'active' | 'onLeave' | 'inactive'
          phone?: string
          email?: string
          join_date?: string
          address?: string
          avatar_url?: string | null
          skills?: string[]
          medeni_durum?: 'bekar' | 'evli'
          cocuk_sayisi?: number
          engelli_durumu?: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          employee_type?: 'normal' | 'emekli'
          approval_passcode?: string | null
          approval_signature?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      izin_talepleri: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          izin_turu: 'yillik' | 'mazeret' | 'hastalik' | 'dogum' | 'babalik' | 'evlilik' | 'olum' | 'askerlik' | 'ucretsiz'
          baslangic_tarihi: string
          bitis_tarihi: string
          gun_sayisi: number
          aciklama: string
          yol_izni_talep: boolean
          yol_izni_gun: number
          seyahat_yeri: string
          il_disi_seyahat: boolean
          belge_url: string | null
          durum: 'beklemede' | 'onaylandi' | 'reddedildi' | 'iptal'
          onaylayan_id: string | null
          onay_tarihi: string | null
          red_nedeni: string | null
          talep_tarihi: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          izin_turu: 'yillik' | 'mazeret' | 'hastalik' | 'dogum' | 'babalik' | 'evlilik' | 'olum' | 'askerlik' | 'ucretsiz'
          baslangic_tarihi: string
          bitis_tarihi: string
          gun_sayisi?: number
          aciklama?: string
          yol_izni_talep?: boolean
          yol_izni_gun?: number
          seyahat_yeri?: string
          il_disi_seyahat?: boolean
          belge_url?: string | null
          durum?: 'beklemede' | 'onaylandi' | 'reddedildi' | 'iptal'
          onaylayan_id?: string | null
          onay_tarihi?: string | null
          red_nedeni?: string | null
          talep_tarihi?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          izin_turu?: 'yillik' | 'mazeret' | 'hastalik' | 'dogum' | 'babalik' | 'evlilik' | 'olum' | 'askerlik' | 'ucretsiz'
          baslangic_tarihi?: string
          bitis_tarihi?: string
          gun_sayisi?: number
          aciklama?: string
          yol_izni_talep?: boolean
          yol_izni_gun?: number
          seyahat_yeri?: string
          il_disi_seyahat?: boolean
          belge_url?: string | null
          durum?: 'beklemede' | 'onaylandi' | 'reddedildi' | 'iptal'
          onaylayan_id?: string | null
          onay_tarihi?: string | null
          red_nedeni?: string | null
          talep_tarihi?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "izin_talepleri_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "izin_talepleri_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      izin_haklari: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          yil: number
          toplam_hak: number
          kullanilan_izin: number
          kalan_izin: number
          calisma_yili: number
          ise_giris_tarihi: string | null
          hesaplama_tarihi: string
          mazeret_izin: number
          hastalik_izin: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          yil: number
          toplam_hak?: number
          kullanilan_izin?: number
          kalan_izin?: number
          calisma_yili?: number
          ise_giris_tarihi?: string | null
          hesaplama_tarihi?: string
          mazeret_izin?: number
          hastalik_izin?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          yil?: number
          toplam_hak?: number
          kullanilan_izin?: number
          kalan_izin?: number
          calisma_yili?: number
          ise_giris_tarihi?: string | null
          hesaplama_tarihi?: string
          mazeret_izin?: number
          hastalik_izin?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "izin_haklari_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "izin_haklari_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      bordro_items: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          period: string
          sicil_no: string
          tc_no: string
          brut_maas: number
          medeni_durum: 'bekar' | 'evli'
          cocuk_sayisi: number
          engelli_durumu: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          temel_kazanc: number
          yol_parasi: number
          gida_yardimi: number
          cocuk_yardimi: number
          diger_kazanclar: number
          fazla_mesai: number
          fazla_mesai_saat_50: number
          fazla_mesai_saat_100: number
          fazla_mesai_tutar: number
          haftalik_tatil: number
          genel_tatil: number
          yillik_izin_ucreti: number
          ikramiye: number
          prim: number
          servis_ucreti: number
          temsil_etiket: number
          gelir_vergisi: number
          damga_vergisi: number
          sgk_isci_payi: number
          issizlik_sigortasi: number
          sendika_aidat: number
          avans: number
          diger_kesintiler: number
          engelli_indirimi: number
          kidem_tazminati: number
          ihbar_tazminati: number
          toplam_kazanc: number
          toplam_kesinti: number
          net_maas: number
          kumulatif_vergi_matrahi: number
          asgari_ucret_gelir_vergisi_istisnasi: number
          asgari_ucret_damga_vergisi_istisnasi: number
          sgk_isveren_payi: number
          issizlik_isveren_payi: number
          sgk_isveren_indirimi: number
          sgk_isveren_indirim_orani: number
          yillik_toplam_kazanc: number
          yillik_toplam_kesinti: number
          yillik_toplam_net: number
          aciklama: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          period: string
          sicil_no?: string
          tc_no?: string
          brut_maas?: number
          medeni_durum?: 'bekar' | 'evli'
          cocuk_sayisi?: number
          engelli_durumu?: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          temel_kazanc?: number
          yol_parasi?: number
          gida_yardimi?: number
          cocuk_yardimi?: number
          diger_kazanclar?: number
          fazla_mesai?: number
          fazla_mesai_saat_50?: number
          fazla_mesai_saat_100?: number
          fazla_mesai_tutar?: number
          haftalik_tatil?: number
          genel_tatil?: number
          yillik_izin_ucreti?: number
          ikramiye?: number
          prim?: number
          servis_ucreti?: number
          temsil_etiket?: number
          gelir_vergisi?: number
          damga_vergisi?: number
          sgk_isci_payi?: number
          issizlik_sigortasi?: number
          sendika_aidat?: number
          avans?: number
          diger_kesintiler?: number
          engelli_indirimi?: number
          kidem_tazminati?: number
          ihbar_tazminati?: number
          toplam_kazanc?: number
          toplam_kesinti?: number
          net_maas?: number
          kumulatif_vergi_matrahi?: number
          asgari_ucret_gelir_vergisi_istisnasi?: number
          asgari_ucret_damga_vergisi_istisnasi?: number
          sgk_isveren_payi?: number
          issizlik_isveren_payi?: number
          sgk_isveren_indirimi?: number
          sgk_isveren_indirim_orani?: number
          yillik_toplam_kazanc?: number
          yillik_toplam_kesinti?: number
          yillik_toplam_net?: number
          aciklama?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          period?: string
          sicil_no?: string
          tc_no?: string
          brut_maas?: number
          medeni_durum?: 'bekar' | 'evli'
          cocuk_sayisi?: number
          engelli_durumu?: 'yok' | 'birinci' | 'ikinci' | 'ucuncu'
          temel_kazanc?: number
          yol_parasi?: number
          gida_yardimi?: number
          cocuk_yardimi?: number
          diger_kazanclar?: number
          fazla_mesai?: number
          fazla_mesai_saat_50?: number
          fazla_mesai_saat_100?: number
          fazla_mesai_tutar?: number
          haftalik_tatil?: number
          genel_tatil?: number
          yillik_izin_ucreti?: number
          ikramiye?: number
          prim?: number
          servis_ucreti?: number
          temsil_etiket?: number
          gelir_vergisi?: number
          damga_vergisi?: number
          sgk_isci_payi?: number
          issizlik_sigortasi?: number
          sendika_aidat?: number
          avans?: number
          diger_kesintiler?: number
          engelli_indirimi?: number
          kidem_tazminati?: number
          ihbar_tazminati?: number
          toplam_kazanc?: number
          toplam_kesinti?: number
          net_maas?: number
          kumulatif_vergi_matrahi?: number
          asgari_ucret_gelir_vergisi_istisnasi?: number
          asgari_ucret_damga_vergisi_istisnasi?: number
          sgk_isveren_payi?: number
          issizlik_isveren_payi?: number
          sgk_isveren_indirimi?: number
          sgk_isveren_indirim_orani?: number
          yillik_toplam_kazanc?: number
          yillik_toplam_kesinti?: number
          yillik_toplam_net?: number
          aciklama?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bordro_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordro_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      takvim_gunleri: {
        Row: {
          id: string
          company_id: string | null
          tarih: string
          ad: string
          tur: 'resmi_tatil' | 'dini_bayram' | 'ozel_gun' | 'firma_ozel'
          aciklama: string
          calisma_gunu_mu: boolean
          yil: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          tarih: string
          ad: string
          tur?: 'resmi_tatil' | 'dini_bayram' | 'ozel_gun' | 'firma_ozel'
          aciklama?: string
          calisma_gunu_mu?: boolean
          yil: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          tarih?: string
          ad?: string
          tur?: 'resmi_tatil' | 'dini_bayram' | 'ozel_gun' | 'firma_ozel'
          aciklama?: string
          calisma_gunu_mu?: boolean
          yil?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bildirimler: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          baslik: string
          mesaj: string
          tur: 'bilgi' | 'uyari' | 'hata' | 'basari' | 'izin' | 'bordro' | 'sistem'
          oncelik: 'dusuk' | 'normal' | 'yuksek' | 'acil'
          okundu_mu: boolean
          okunma_tarihi: string | null
          link: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          baslik: string
          mesaj: string
          tur?: 'bilgi' | 'uyari' | 'hata' | 'basari' | 'izin' | 'bordro' | 'sistem'
          oncelik?: 'dusuk' | 'normal' | 'yuksek' | 'acil'
          okundu_mu?: boolean
          okunma_tarihi?: string | null
          link?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          baslik?: string
          mesaj?: string
          tur?: 'bilgi' | 'uyari' | 'hata' | 'basari' | 'izin' | 'bordro' | 'sistem'
          oncelik?: 'dusuk' | 'normal' | 'yuksek' | 'acil'
          okundu_mu?: boolean
          okunma_tarihi?: string | null
          link?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ozluk_dosyalari: {
        Row: {
          id: string
          employee_id: string
          company_id: string
          kategori: string
          dosya_adi: string | null
          dosya_yolu: string | null
          notlar: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          company_id: string
          kategori: string
          dosya_adi?: string | null
          dosya_yolu?: string | null
          notlar?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          company_id?: string
          kategori?: string
          dosya_adi?: string | null
          dosya_yolu?: string | null
          notlar?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ozluk_dosyalari_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ozluk_dosyalari_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      employees_public: {
        Row: {
          id: string
          company_id: string
          name: string
          sicil_no: string
          department: string
          position: string
          level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager'
          status: 'active' | 'onLeave' | 'inactive'
          email: string
          join_date: string
          avatar_url: string | null
          skills: string[]
          employee_type: 'normal' | 'emekli'
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}