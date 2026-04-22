; Add an "Uninstall" shortcut alongside the app shortcut in the Start Menu folder
!macro customInstall
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk" \
    "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
!macroend

; Remove the uninstall shortcut when the user uninstalls
!macro customUnInstall
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall ${PRODUCT_NAME}.lnk"
!macroend
