// import React, { Component } from 'react';
// class KommunicateChat extends Component {
//     constructor(props) {
//         super(props);
//     }
//     componentDidMount() {
//         (function (d, m) {
//             var kommunicateSettings = { "appId": "8b8547ed8cd61f4a95701bc0391db4ae", "popupWidget": true, "automaticChatOpenOnNavigation": true };
//             var s = document.createElement("script"); s.type = "text/javascript"; s.async = true;
//             s.src = "https://widget.kommunicate.io/v2/kommunicate.app";
//             var h = document.getElementsByTagName("head")[0]; h.appendChild(s);
//             window.kommunicate = m; m._globals = kommunicateSettings;
//         })(document, window.kommunicate || {});
//     }
//     render() {
//         return (
//             <div></div>
//         )
//     }
// }
// export default KommunicateChat;

import React, { Component } from 'react';

declare global {
  interface Window {
    kommunicate: any;
  }
}

class KommunicateChat extends Component {
  componentDidMount(): void {
    (function (d: Document, m: any) {
      const kommunicateSettings = {
        appId: '8b8547ed8cd61f4a95701bc0391db4ae',
        popupWidget: true,
        automaticChatOpenOnNavigation: true,
      };

      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://widget.kommunicate.io/v2/kommunicate.app';

      const h = document.getElementsByTagName('head')[0];
      h.appendChild(s);

      window.kommunicate = m;
      m._globals = kommunicateSettings;
    })(document, window.kommunicate || {});
  }

  render() {
    return <div></div>;
  }
}

export default KommunicateChat;
