<?php

namespace Tests\Unit;

use App\Support\UserAgentDevice;
use PHPUnit\Framework\TestCase;

class UserAgentDeviceTest extends TestCase
{
    public function test_empty_defaults_to_desktop(): void
    {
        $this->assertSame('desktop', UserAgentDevice::infer(null));
        $this->assertSame('desktop', UserAgentDevice::infer(''));
    }

    public function test_tablet_and_mobile_patterns(): void
    {
        $this->assertSame('tablet', UserAgentDevice::infer('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'));
        $this->assertSame('mobile', UserAgentDevice::infer('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'));
        $this->assertSame('mobile', UserAgentDevice::infer('Mozilla/5.0 (Linux; Android 12) AppleWebKit'));
        $this->assertSame('desktop', UserAgentDevice::infer('Mozilla/5.0 (Windows NT 10.0) AppleWebKit'));
    }
}
