<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\Etrike;
use App\Models\Status;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = ['RUNNING' => 'Running', 'HALF_DAY' => 'Half-Day Running', 'REPAIR' => 'Under Repair', 'STANDBY_FOR_REPAIR' => 'Standby for Repair', 'NO_DRIVER' => 'No Driver', 'DRIVER_UNAVAILABLE' => 'Driver Unavailable', 'NO_OPERATION' => 'No Operation', 'OTHER' => 'Other'];
        foreach ($statuses as $code => $name) {
            Status::firstOrCreate(['code' => $code], ['name' => $name, 'sort_order' => array_search($code, array_keys($statuses)), 'is_active' => true]);
        }
        $names = ['CATOTO', 'YBAÑEZ', 'GOMAOD', 'ARANDA', 'TRIBUNAL', 'LABASTIDA', 'CEREZ', 'VILLANUEVA', 'CALO', 'TRILLO', 'ABABON', 'AMAR', 'SOLIS', 'RODION', 'ABREA', 'SORONGON', 'PUDE', 'TENIO', 'PADERNAL', 'EDGAR', 'LOKTOY'];
        foreach ($names as $name) {
            Driver::firstOrCreate(['display_name' => $name], ['first_name' => $name, 'last_name' => $name, 'is_active' => true]);
        }
        $plates = ['Z138VA', '804ZOA', '800ZOA', 'Z139VA', '799ZOA', '848ZOA', '802ZOA', '850ZOA', 'Z140VA', 'Z142VA', '855ZOA', '805ZOA', '798ZOA', '849ZOA', 'Z141VA', 'Z137VA', '845ZOA'];
        foreach ($plates as $i => $plate) {
            Etrike::firstOrCreate(['plate_number' => $plate], ['unit_code' => 'ET-'.str_pad($i + 1, 3, '0', STR_PAD_LEFT), 'default_driver_id' => Driver::where('display_name', $names[$i])->value('id'), 'is_active' => true]);
        }
        if (app()->environment(['local', 'testing'])) {
            $password = env('DEMO_ADMIN_PASSWORD');
            if (! $password) {
                $password = bin2hex(random_bytes(12)).'Aa1!';
                if ($this->command) {
                    $this->command->warn('Local demo password (all demo roles): '.$password);
                }
            }
            foreach (['admin' => 'Fleet Administrator', 'operator' => 'Daily Reporter', 'viewer' => 'Fleet Owner'] as $role => $name) {
                User::firstOrCreate(['email' => $role.'@etrike.local'], ['name' => $name, 'password' => $password, 'role' => $role, 'is_active' => true]);
            }
            $this->call(DemoReportSeeder::class);
        }
    }
}
