using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Npgsql;

namespace BigsaferPortal.Sync
{
    /// <summary>
    /// Portal sunucusunda 7/24 veya planlanmış görev (Task Scheduler) olarak çalışacak
    /// Supabase'den MS SQL Server'a çift yönlü/tek yönlü arka plan senkronizasyon servisi.
    /// </summary>
    public class HumaniusBackgroundSyncService
    {
        private readonly string _sqlConnStr = "Server=YOUR_SQL_SERVER;Database=BigsaferPortal;User Id=YOUR_USER;Password=YOUR_PASSWORD;";
        private readonly string _pgConnStr = "Host=aws-0-eu-central-1.pooler.supabase.com;Database=postgres;Username=postgres.gfbtjdedaoleqhrlebof;Password=.Humanius123;Port=6543;";

        // Son senkronizasyon zamanını saklamak için (Bellekte veya SQL Server'da bir tabloda tutulabilir)
        private DateTime _lastSyncTime = DateTime.UtcNow.AddDays(-1); 

        public async Task StartSyncLoopAsync(CancellationToken cancellationToken)
        {
            Console.WriteLine("Senkronizasyon Servisi Başlatıldı.");

            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    DateTime currentRunTime = DateTime.UtcNow;
                    
                    await SyncCompaniesFromSupabaseToSqlAsync();
                    await SyncUsersFromSupabaseToSqlAsync();
                    
                    _lastSyncTime = currentRunTime;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Senkronizasyon sırasında hata oluştu: {ex.Message}");
                }

                // Her 2 dakikada bir çalıştır (Süreyi isteğinize göre ayarlayabilirsiniz)
                await Task.Delay(TimeSpan.FromMinutes(2), cancellationToken);
            }
        }

        /// <summary>
        /// Supabase'de güncellenen şirketleri çekip SQL Server'a yazar.
        /// </summary>
        private async Task SyncCompaniesFromSupabaseToSqlAsync()
        {
            using var pgConn = new NpgsqlConnection(_pgConnStr);
            using var sqlConn = new SqlConnection(_sqlConnStr);
            await pgConn.OpenAsync();
            await sqlConn.OpenAsync();

            // Son senkronizasyon tarihinden sonra güncellenen firmaları çek
            using var pgCmd = new NpgsqlCommand(@"
                SELECT id, name, updated_at 
                FROM public.companies 
                WHERE updated_at > @lastSync", pgConn);
            pgCmd.Parameters.AddWithValue("lastSync", _lastSyncTime);

            using var reader = await pgCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                string uuid = reader.GetGuid(0).ToString();
                string name = reader.IsDBNull(1) ? "Bilinmeyen Şirket" : reader.GetString(1);
                int id = MapUuidToInt(uuid);

                using var sqlCmd = new SqlCommand(@"
                    MERGE INTO Company AS target
                    USING (SELECT @id AS id) AS source
                    ON (target.id = source.id)
                    WHEN MATCHED THEN
                        UPDATE SET name = @name
                    WHEN NOT MATCHED THEN
                        INSERT (id, name) VALUES (@id, @name);", sqlConn);

                sqlCmd.Parameters.AddWithValue("id", id);
                sqlCmd.Parameters.AddWithValue("name", name);
                await sqlCmd.ExecuteNonQueryAsync();
                
                Console.WriteLine($"Şirket Eşitlendi: {name} (ID: {id})");
            }
        }

        /// <summary>
        /// Supabase'de güncellenen kullanıcıları ve detayları çekip SQL Server'a yazar.
        /// </summary>
        private async Task SyncUsersFromSupabaseToSqlAsync()
        {
            using var pgConn = new NpgsqlConnection(_pgConnStr);
            using var sqlConn = new SqlConnection(_sqlConnStr);
            await pgConn.OpenAsync();
            await sqlConn.OpenAsync();

            // 1. Profiles Eşitleme (Users Tablosu)
            using var pgProfileCmd = new NpgsqlCommand(@"
                SELECT id, company_id, role, email, full_name, updated_at 
                FROM public.profiles 
                WHERE updated_at > @lastSync", pgConn);
            pgProfileCmd.Parameters.AddWithValue("lastSync", _lastSyncTime);

            using (var reader = await pgProfileCmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    string uuid = reader.GetGuid(0).ToString();
                    string companyUuid = reader.IsDBNull(1) ? "" : reader.GetGuid(1).ToString();
                    string role = reader.IsDBNull(2) ? "employee" : reader.GetString(2);
                    string email = reader.IsDBNull(3) ? "" : reader.GetString(3);
                    string fullName = reader.IsDBNull(4) ? "" : reader.GetString(4);

                    int userId = MapUuidToInt(uuid);
                    int companyId = string.IsNullOrEmpty(companyUuid) ? 0 : MapUuidToInt(companyUuid);
                    int humaniusyetki = MapRoleToYetki(role);

                    string[] nameParts = fullName.Split(' ', 2);
                    string name = nameParts[0];
                    string lastname = nameParts.Length > 1 ? nameParts[1] : "";

                    using var sqlCmd = new SqlCommand(@"
                        MERGE INTO Users AS target
                        USING (SELECT @id AS id) AS source
                        ON (target.id = source.id)
                        WHEN MATCHED THEN
                            UPDATE SET companiyid = @companiyid, name = @name, lastname = @lastname, email = @email, humaniusyetki = @humaniusyetki
                        WHEN NOT MATCHED THEN
                            INSERT (id, companiyid, name, lastname, email, humaniusyetki, password) 
                            VALUES (@id, @companiyid, @name, @lastname, @email, @humaniusyetki, '123456');", sqlConn);

                    sqlCmd.Parameters.AddWithValue("id", userId);
                    sqlCmd.Parameters.AddWithValue("companiyid", companyId);
                    sqlCmd.Parameters.AddWithValue("name", name);
                    sqlCmd.Parameters.AddWithValue("lastname", lastname);
                    sqlCmd.Parameters.AddWithValue("email", email);
                    sqlCmd.Parameters.AddWithValue("humaniusyetki", humaniusyetki);
                    await sqlCmd.ExecuteNonQueryAsync();
                }
            }

            // 2. Employees Eşitleme (UserDetails Tablosu)
            using var pgEmpCmd = new NpgsqlCommand(@"
                SELECT id, tc_no, address, sicil_no, position, level, salary, cocuk_sayisi, 
                       approval_passcode, employee_type, approval_signature, updated_at 
                FROM public.employees 
                WHERE updated_at > @lastSync", pgConn);
            pgEmpCmd.Parameters.AddWithValue("lastSync", _lastSyncTime);

            using (var reader = await pgEmpCmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    string uuid = reader.GetGuid(0).ToString();
                    int userId = MapUuidToInt(uuid);

                    string tcNo = reader.IsDBNull(1) ? "" : reader.GetString(1);
                    string address = reader.IsDBNull(2) ? "" : reader.GetString(2);
                    string sicilNo = reader.IsDBNull(3) ? "" : reader.GetString(3);
                    string position = reader.IsDBNull(4) ? "" : reader.GetString(4);
                    string level = reader.IsDBNull(5) ? "Mid" : reader.GetString(5);
                    decimal salary = reader.IsDBNull(6) ? 0 : reader.GetDecimal(6);
                    int children = reader.IsDBNull(7) ? 0 : reader.GetInt32(7);
                    string passcode = reader.IsDBNull(8) ? null : reader.GetString(8);
                    string employeeType = reader.IsDBNull(9) ? "normal" : reader.GetString(9);
                    string signature = reader.IsDBNull(10) ? null : reader.GetString(10);

                    using var sqlCmd = new SqlCommand(@"
                        MERGE INTO UserDetails AS target
                        USING (SELECT @UserId AS UserId) AS source
                        ON (target.UserId = source.UserId)
                        WHEN MATCHED THEN
                            UPDATE SET TcNo = @TcNo, Adres = @Adres, SicilNo = @SicilNo, Posizyon = @Posizyon, 
                                       Level = @Level, Maas = @Maas, CocukSayisi = @CocukSayisi, 
                                       ApprovalPasscode = @ApprovalPasscode, EmployeeType = @EmployeeType, ApprovalSignature = @ApprovalSignature
                        WHEN NOT MATCHED THEN
                            INSERT (UserId, TcNo, Adres, SicilNo, Posizyon, Level, Maas, CocukSayisi, ApprovalPasscode, EmployeeType, ApprovalSignature)
                            VALUES (@UserId, @TcNo, @Adres, @SicilNo, @Posizyon, @Level, @Maas, @CocukSayisi, @ApprovalPasscode, @EmployeeType, @ApprovalSignature);", sqlConn);

                    sqlCmd.Parameters.AddWithValue("UserId", userId);
                    sqlCmd.Parameters.AddWithValue("TcNo", tcNo);
                    sqlCmd.Parameters.AddWithValue("Adres", address);
                    sqlCmd.Parameters.AddWithValue("SicilNo", sicilNo);
                    sqlCmd.Parameters.AddWithValue("Posizyon", position);
                    sqlCmd.Parameters.AddWithValue("Level", level);
                    sqlCmd.Parameters.AddWithValue("Maas", salary);
                    sqlCmd.Parameters.AddWithValue("CocukSayisi", children);
                    sqlCmd.Parameters.AddWithValue("ApprovalPasscode", (object)passcode ?? DBNull.Value);
                    sqlCmd.Parameters.AddWithValue("EmployeeType", employeeType);
                    sqlCmd.Parameters.AddWithValue("ApprovalSignature", (object)signature ?? DBNull.Value);
                    await sqlCmd.ExecuteNonQueryAsync();
                    
                    Console.WriteLine($"Kullanıcı Detayları Eşitlendi: ID {userId}");
                }
            }
        }

        private static int MapUuidToInt(string uuid)
        {
            if (string.IsNullOrEmpty(uuid)) return 0;
            string lastPart = uuid.Substring(uuid.LastIndexOf('-') + 1);
            return int.TryParse(lastPart, out int id) ? id : 0;
        }

        private static int MapRoleToYetki(string role) => role switch
        {
            "superadmin" => 1,
            "admin" => 2,
            "hr" => 3,
            "manager" => 4,
            _ => 5
        };
    }
}
