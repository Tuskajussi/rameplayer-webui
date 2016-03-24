/*jshint maxcomplexity:22 */
/*jshint maxstatements:54 */
(function() {

    'use strict';

    angular.module('rameplayer.admin').controller(
            'AdminController', AdminController);

    AdminController.$inject = [
            'logger', 'dataService', 'toastr', '$rootScope', '$translate', 'statusService'
    ];

    function AdminController(logger, dataService, toastr, $rootScope, $translate, statusService) {
        var vm = this;
        vm.systemSettings = dataService.getSystemSettings();
        vm.systemSettings.$promise.then(function() {
            init();
        });

        vm.audioPorts = [
            'rameAnalogOnly', 'rameHdmiOnly', 'rameHdmiAndAnalog'
        ];
        vm.prefillDhcpOcts = prefillDhcpOcts;
        vm.saveSettings = saveSettings;
        vm.factoryReset = factoryReset;
        vm.savingStatus = 'loaded';
        vm.useNtpIp = false;
        vm.useManualTimeConfigs = false;
        vm.manualTimeConfig = manualTimeConfig;
        vm.manualDateTime = null;
        vm.dateUserInput = null;
        vm.timeUserInput = null;

        vm.videoOutputResolutions = [
            'rameAutodetect',
            'rame720p50',
            'rame720p60',
            'rame1080i50',
            'rame1080i60',
            'rame1080p50',
            'rame1080p60'
        ];

        /**
         * @name init
         * @description Initializes variables.
         * Called after system settings are fetched from server.
         */
        function init() {
            vm.manualIpConfig = !vm.systemSettings.ipDhcpClient;
            vm.deviceName = vm.systemSettings.hostname;

            vm.deviceIp = {
                value: vm.systemSettings['ipAddress'],
                valid: true
            };
            vm.subnetMask = {
                value: vm.systemSettings['ipSubnetMask'],
                valid: true
            };
            vm.gatewayIp = {
                value: vm.systemSettings['ipGateway'],
                valid: true
            };
            vm.dnsServerIp = {
                value: vm.systemSettings['ipDnsPrimary'],
                valid: true
            };
            vm.dnsAlternativeServerIp = {
                value: vm.systemSettings['ipDnsSecondary'],
                valid: true
            };
            vm.dhcpServerRangeStartIp = {
                value: vm.systemSettings['ipDhcpRangeStart'],
                valid: true
            };
            vm.dhcpServerRangeEndIp = {
                value: vm.systemSettings['ipDhcpRangeEnd'],
                valid: true
            };

            vm.ntpServerAddress = vm.systemSettings.ntpServerAddress;
            vm.ntpServerIp = {
                value : vm.systemSettings['ntpServerAddress'],
                valid : true
            };
            vm.timeInitially = vm.systemSettings.dateAndTimeInUTC;
        }

        function saveSettings() {
            var valid = true;
            var invalidFields = [];
            
            if (!vm.deviceName) {
                // Compliance to Internet standard specification RFC 1123
                // Match against regexp already done using ng-pattern
                //.match(/^[a-z\d]([a-z\d\-]{0,61}[a-z\d])?(\.[a-z\d]([a-z\d\-]{0,61}[a-z\d])?)*$/i)){
                invalidFields.push('DEVICE_HOSTNAME');
                valid = false;
            }  
            
            if (vm.manualIpConfig) {
                vm.systemSettings.ipDhcpClient = false;
                if (!vm.deviceIp.valid) {
                    invalidFields.push('DEVICE_IP');
                }
                if (!vm.subnetMask.valid) {
                    invalidFields.push('SUBNET_MASK');
                }
                /* 
                // TODO: ?? Should it be possible to leave these unset,
                // empty or zero, in case of not connected to Internet ?? 
                */ 
                if (!vm.gatewayIp.valid) {
                    invalidFields.push('GATEWAY_IP');
                }
                if (!vm.dnsServerIp.valid) {
                    invalidFields.push('DNS_FIRST');
                }
                if (!vm.dnsAlternativeServerIp.valid) {
                    invalidFields.push('DNS_SECOND');
                }
                if (vm.systemSettings.ipDhcpServer) {
                    var octets;
                    if (!vm.dhcpServerRangeStartIp.valid) {
                        invalidFields.push('DHCP_RANGE_START');
                    }
                    else {
                        octets = vm.dhcpServerRangeStartIp.value.split('.');
                        if (octets[3] === '0') {
                            invalidFields.push('DHCP_RANGE_START');
                        }
                    }

                    if (!vm.dhcpServerRangeEndIp.valid) {
                        invalidFields.push('DHCP_RANGE_END');
                    }
                    else {
                        octets = vm.dhcpServerRangeEndIp.value.split('.');
                        if (octets[3] === '255') {
                            invalidFields.push('DHCP_RANGE_END');
                        }
                    }

                    if (!validateIpOrdering(vm.dhcpServerRangeStartIp.value, vm.dhcpServerRangeEndIp.value)) {
                        invalidFields.push('DHCP_RANGE_DEF');
                    }                    
                }
            }
            
            if (vm.useManualTimeConfigs) {
                if (!vm.dateUserInput) {
                    invalidFields.push('MANUAL_DATE');
                }
                if (!vm.timeUserInput) {
                    invalidFields.push('MANUAL_TIME');
                }
                vm.manualDateTime = validateManualDateTime(vm.dateUserInput, vm.timeUserInput);
            }
            else if (!vm.ntpForm.ntpHostname.$valid) {
                invalidFields.push('NTP_SERVER_HOSTNAME');
            }
            // logger.info(basicsForm.deviceName.$valid);
            // logger.info($('#ntpHostname').$valid);
            // logger.info(vm.ntpForm.ntpHostname.$valid);
            //            logger.info(vm.ntpServerAddress);
            
            if (invalidFields.length) {
                valid = false;
                $translate(['INVALID_SETTINGS']).then(function(tr) {
                    $translate(invalidFields).then(function(trf) {
                        var msg = '';
                        for (var i = 0; i < invalidFields.length; i++) {
                            msg += trf[invalidFields[i]];
                            if (invalidFields.length > 1 && i < invalidFields.length - 1) {
                                msg += ', ';
                            }
                        }
                        // Sticky toast
                        toastr.error(msg, tr.INVALID_SETTINGS, {
                            timeOut : 0,
                            closeButton: true
                        });
                    });
                });
            }
            
            if (valid) {
                assignSystemSettings();
                vm.systemSettings
                        .$save(function(response) {
                            vm.savingStatus = 'saved';
                            logger.debug('Admin setting save success, response: ' + response.data, response);
                            toastr.clear();
                            toastr.success('Admin settings saved.', 'Saved');
                            statusService.resetServerNotifications();
                        }, function(response) {
                            logger.error('Admin setting save failed, response data: ' + response.data);
                            logger.debug(response);
                            toastr.clear();
                            toastr.error('Saving admin settings failed.', 'Saving failed', {
                                timeOut : 0,
                                closeButton : true
                            });
                            statusService.resetServerNotifications();
                            throw new Error(response.data + ' ' + response.toString()); 
                        });
            }
            else {
                $translate(['CHECK_INSERTED_VALUES', 'ADMIN_SETTINGS_NOT_SAVED'])
                    .then(function(tr) {
                    toastr.error(tr.ADMIN_SETTINGS_NOT_SAVED, tr.CHECK_INSERTED_VALUES);
                });
            }
            //toastr.error('saveSettings: ' + $rootScope.rameExceptions, $rootScope.rameException);
            //throw new Error('testerror');
        }
        
        function assignSystemSettings() {
            vm.systemSettings.hostname = vm.deviceName;
            vm.systemSettings.ipDhcpClient = !vm.manualIpConfig;
            if (vm.manualIpConfig) {
                vm.systemSettings.ipAddress = vm.deviceIp.value;
                vm.systemSettings.ipSubnetMask = vm.subnetMask.value;
                vm.systemSettings.ipGateway = vm.gatewayIp.value;
                vm.systemSettings.ipDnsPrimary = vm.dnsServerIp.value;
                vm.systemSettings.ipDnsSecondary = vm.dnsAlternativeServerIp.value;
                //logger.debug(vm.deviceIp + ' ' + vm.systemSettings.ipAddress);
                if (vm.systemSettings.ipDhcpServer) {
                    vm.systemSettings.ipDhcpRangeStart = vm.dhcpRangeStartIp.value;
                    vm.systemSettings.ipDhcpRangeEnd = vm.dhcpRangeEndIp.value;
                }
            }
            
            if (vm.useManualTimeConfigs) {
                vm.systemSettings.dateAndTimeInUTC = vm.manualDateTime;
            }
            else if (vm.useNtpIp) {
                vm.systemSettings.ntpServerAddress = vm.ntpServerIp;
            }
            else {
                vm.systemSettings.ntpServerAddress = vm.ntpServerAddress;
            }
        }
        
        function factoryReset() {
            toastr.warning('TODO Factory reset');
        }

        function validateIpOrdering(smallerIp, biggerIp) {
            // JS API: JavaScript Numbers are Always 64-bit Floating Point.
            // Bit operators work on 32-bit signed numbers.
            // Any numeric operand in the operation is converted into a 32-bit number.
            // Hence multiplication hack instead of bitwise operation.
            var smallerOcts = smallerIp.split('.');
            var biggerOcts = biggerIp.split('.');
            var small = smallerOcts[0] * 16777216 +
                smallerOcts[1] * 65536 + 
                smallerOcts[2] * 256 +
                smallerOcts[3]; 
            var big = biggerOcts[0] * 16777216 +
                biggerOcts[1] * 65536 +
                biggerOcts[2] * 256 +
                biggerOcts[3];
            
            return small <= big; 
        }
        
        function prefillDhcpOcts() {
            var octets = vm.deviceIp.value ? vm.deviceIp.value.split('.') : ['', '', '', ''];
            var ip = octets[0] + '.' + octets[1] + '.' + octets[2] + '.';
            vm.dhcpServerRangeStartIp.value = ip;
            vm.dhcpServerRangeEndIp.value = ip;
        }
        
        function manualTimeConfig() {
            vm.useManualTimeConfigs = !vm.useManualTimeConfigs;
            if (vm.useManualTimeConfigs) {
                vm.useNtpIp = false;
            }
        }
        
        function validateManualDateTime(date, time) {
            if (date != undefined && time != undefined) { // jshint ignore:line
                return (date + ' ' + time);
            }
            return undefined;
        }
    }
})();
