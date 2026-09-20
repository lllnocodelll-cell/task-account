import fs from 'fs';

const filePath = 'pages/Profile.tsx';
const content = fs.readFileSync(filePath, 'utf-8');

const anchor = 'onClick={handleCancelSecurity}';
const idx = content.indexOf(anchor);
if (idx === -1) {
  console.error('Anchor not found');
  process.exit(1);
}

const beforeSection = content.lastIndexOf('<div className="flex flex-col-reverse', idx);
if (beforeSection === -1) {
  console.error('div not found');
  process.exit(1);
}

const bannerCode = 
'                           <div className="pt-4 border-t border-slate-100 dark:border-slate-800">\r\n' +
'                              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">\r\n' +
'                                 Notificações no Dispositivo (Web Push)\r\n' +
'                              </h3>\r\n' +
'                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">\r\n' +
'                                 Receba alertas em tempo real no seu smartphone ou navegador mesmo com o aplicativo fechado.\r\n' +
'                              </p>\r\n' +
'                              {profile?.id && (\r\n' +
'                                 <PushNotificationBanner \r\n' +
'                                    compact \r\n' +
'                                    userId={profile.id} \r\n' +
'                                    orgId={profile.org_id} \r\n' +
'                                 />\r\n' +
'                              )}\r\n' +
'                           </div>\r\n\r\n';

const newContent = content.slice(0, beforeSection) + bannerCode + content.slice(beforeSection);
fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('Inserted successfully!');
