using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace BigsaferPortal.Controllers
{
    [ApiController]
    [Route("api/sync")]
    public class HumaniusWebhookController : ControllerBase
    {
        private readonly string _sqlConnStr = "Server=YOUR_SQL_SERVER;Database=BigsaferPortal;User Id=YOUR_USER;Password=YOUR_PASSWORD;";

        /// <summary>
        /// Supabase 'companies' tablosundaki değişiklikleri anlık olarak SQL Server 'Company' tablosuna yazar.
        /// </summary>
        [HttpPost("company")]
        public async Task<IActionResult> SyncCompany([FromBody] JsonElement payload)
        {
            try
            {
                string type = payload.GetProperty("type").GetString(); // INSERT, UPDATE, DELETE
                JsonElement record = payload.GetProperty("record");
                JsonElement oldRecord = payload.GetProperty("old_record");

                if (type == "DELETE")
                {
                    string uuid = oldRecord.GetProperty("id").GetString();
                    int id = MapUuidToInt(uuid);

                    using var conn = new SqlConnection(_sqlConnStr);
                    await conn.OpenAsync();
                    using var cmd = new SqlCommand("DELETE FROM Company WHERE id = @id", conn);
                    cmd.Parameters.AddWithValue("id", id);
                    await cmd.ExecuteNonQueryAsync();
                }
                else // INSERT or UPDATE
                {
                    string uuid = record.GetProperty("id").GetString();
                    string name = record.GetProperty("name").GetString() ?? "Bilinmeyen Şirket";
                    int id = MapUuidToInt(uuid);

                    using var conn = new SqlConnection(_sqlConnStr);
                    await conn.OpenAsync();

                    using var cmd = new SqlCommand(@"
                        MERGE INTO Company AS target
                        USING (SELECT @id AS id) AS source
                        ON (target.id = source.id)
                        WHEN MATCHED THEN
                            UPDATE SET name = @name
                        WHEN NOT MATCHED THEN
                            INSERT (id, name) VALUES (@id, @name);", conn);

                    cmd.Parameters.AddWithValue("id", id);
                    cmd.Parameters.AddWithValue("name", name);
                    await cmd.ExecuteNonQueryAsync();
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Supabase 'employees' ve 'profiles' değişikliklerini SQL Server 'Users' ve 'UserDetails' tablolarına yazar.
        /// </summary>
        [HttpPost("user")]
        public async Task<IActionResult> SyncUser([FromBody] JsonElement payload)
        {
            try
            {
                string type = payload.GetProperty("type").GetString();
                string table = payload.GetProperty("table").GetString(); // profiles veya employees
                JsonElement record = payload.GetProperty("record");
                JsonElement oldRecord = payload.GetProperty("old_record");

                if (type == "DELETE")
                {
                    string uuid = oldRecord.GetProperty("id").GetString();
                    int userId = MapUuidToInt(uuid);

                    using var conn = new SqlConnection(_sqlConnStr);
                    await conn.OpenAsync();
                    
                    // UserDetails ve Users'tan sil
                    using var cmd = new SqlCommand("DELETE FROM UserDetails WHERE UserId = @id; DELETE FROM Users WHERE id = @id;", conn);
                    cmd.Parameters.AddWithValue("id", userId);
                    await cmd.ExecuteNonQueryAsync();
                }
                else // INSERT or UPDATE
                {
                    string uuid = record.GetProperty("id").GetString();
                    int userId = MapUuidToInt(uuid);

                    using var conn = new SqlConnection(_sqlConnStr);
                    await conn.OpenAsync();

                    if (table == "profiles")
                    {
                        string email = record.GetProperty("email").GetString() ?? "";
                        string fullName = record.GetProperty("full_name").GetString() ?? "";
                        string role = record.GetProperty("role").GetString() ?? "employee";
                        string companyUuid = record.GetProperty("company_id").GetString();
                        int companyId = string.IsNullOrEmpty(companyUuid) ? 0 : MapUuidToInt(companyUuid);

                        string[] nameParts = fullName.Split(' ', 2);
                        string name = nameParts[0];
                        string lastname = nameParts.Length > 1 ? nameParts[1] : "";
                        int humaniusyetki = MapRoleToYetki(role);

                        using var cmd = new SqlCommand(@"
                            MERGE INTO Users AS target
                            USING (SELECT @id AS id) AS source
                            ON (target.id = source.id)
                            WHEN MATCHED THEN
                                UPDATE SET companiyid = @companiyid, name = @name, lastname = @lastname, email = @email, humaniusyetki = @humaniusyetki
                            WHEN NOT MATCHED THEN
                                INSERT (id, companiyid, name, lastname, email, humaniusyetki, password) 
                                VALUES (@id, @companiyid, @name, @lastname, @email, @humaniusyetki, '123456');", conn);

                        cmd.Parameters.AddWithValue("id", userId);
                        cmd.Parameters.AddWithValue("companiyid", companyId);
                        cmd.Parameters.AddWithValue("name", name);
                        cmd.Parameters.AddWithValue("lastname", lastname);
                        cmd.Parameters.AddWithValue("email", email);
                        cmd.Parameters.AddWithValue("humaniusyetki", humaniusyetki);
                        await cmd.ExecuteNonQueryAsync();
                    }
                    else if (table == "employees")
                    {
                        string tcNo = record.TryGetProperty("tc_no", out var tc) ? tc.GetString() ?? "" : "";
                        string address = record.TryGetProperty("address", out var adr) ? adr.GetString() ?? "" : "";
                        string sicilNo = record.TryGetProperty("sicil_no", out var sic) ? sic.GetString() ?? "" : "";
                        string position = record.TryGetProperty("position", out var pos) ? pos.GetString() ?? "" : "";
                        string level = record.TryGetProperty("level", out var lvl) ? lvl.GetString() ?? "Mid" : "Mid";
                        decimal salary = record.TryGetProperty("salary", out var sal) && sal.ValueKind == JsonValueKind.Number ? sal.GetDecimal() : 0;
                        int children = record.TryGetProperty("cocuk_sayisi", out var chld) && chld.ValueKind == JsonValueKind.Number ? chld.GetInt32() : 0;
                        string passcode = record.TryGetProperty("approval_passcode", out var pass) ? pass.GetString() : null;
                        string signature = record.TryGetProperty("approval_signature", out var sig) ? sig.GetString() : null;
                        string employeeType = record.TryGetProperty("employee_type", out var typeEmp) ? typeEmp.GetString() : "normal";

                        using var cmd = new SqlCommand(@"
                            MERGE INTO UserDetails AS target
                            USING (SELECT @UserId AS UserId) AS source
                            ON (target.UserId = source.UserId)
                            WHEN MATCHED THEN
                                UPDATE SET TcNo = @TcNo, Adres = @Adres, SicilNo = @SicilNo, Posizyon = @Posizyon, 
                                           Level = @Level, Maas = @Maas, CocukSayisi = @CocukSayisi, 
                                           ApprovalPasscode = @ApprovalPasscode, EmployeeType = @EmployeeType, ApprovalSignature = @ApprovalSignature
                            WHEN NOT MATCHED THEN
                                INSERT (UserId, TcNo, Adres, SicilNo, Posizyon, Level, Maas, CocukSayisi, ApprovalPasscode, EmployeeType, ApprovalSignature)
                                VALUES (@UserId, @TcNo, @Adres, @SicilNo, @Posizyon, @Level, @Maas, @CocukSayisi, @ApprovalPasscode, @EmployeeType, @ApprovalSignature);", conn);

                        cmd.Parameters.AddWithValue("UserId", userId);
                        cmd.Parameters.AddWithValue("TcNo", tcNo);
                        cmd.Parameters.AddWithValue("Adres", address);
                        cmd.Parameters.AddWithValue("SicilNo", sicilNo);
                        cmd.Parameters.AddWithValue("Posizyon", position);
                        cmd.Parameters.AddWithValue("Level", level);
                        cmd.Parameters.AddWithValue("Maas", salary);
                        cmd.Parameters.AddWithValue("CocukSayisi", children);
                        cmd.Parameters.AddWithValue("ApprovalPasscode", (object)passcode ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("EmployeeType", employeeType);
                        cmd.Parameters.AddWithValue("ApprovalSignature", (object)signature ?? DBNull.Value);
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private static int MapUuidToInt(string uuid)
        {
            if (string.IsNullOrEmpty(uuid)) return 0;
            // Deterministik UUID formatından son sayısal kısmı ayıklar:
            // "00000000-0000-0000-0000-000000000145" -> 145
            string lastPart = uuid.Substring(uuid.LastIndexOf('-') + 1);
            return int.TryParse(lastPart, out int id) ? id : 0;
        }

        private static int MapRoleToYetki(string role)
        {
            return role switch
            {
                "superadmin" => 1,
                "admin" => 2,
                "hr" => 3,
                "manager" => 4,
                _ => 5
            };
        }
    }
}
