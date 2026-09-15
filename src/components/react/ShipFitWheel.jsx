import React from 'react'
import {
  EveDataProvider,
  DefaultCharactersProvider,
  CurrentCharacterProvider,
  DogmaEngineProvider,
  CurrentFitProvider,
  StatisticsProvider,
  ShipFit,
  useCurrentFit,
  useImportEveShipFit,
  useExportEft,
  ShipStatistics,
} from '@eveshipfit/react'

const DATA_URL = 'https://edge.socketkill.com/eft/'

function FitLoader({ killID, killmailHash }) {
  const { setFit } = useCurrentFit()
  const importFit = useImportEveShipFit()
  const importRef = React.useRef(importFit)
  importRef.current = importFit

  React.useEffect(() => {
    let cancelled = false
    importRef.current(`killmail:${killID}/${killmailHash}`).then((fit) => {
      if (!cancelled && fit) setFit(fit)
    })
    return () => { cancelled = true }
  }, [killID, killmailHash, setFit])

  return null
}

function EftExportButton() {
  const exportEft = useExportEft()
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef(null)

  React.useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleClick = React.useCallback(() => {
    const eft = exportEft()
    if (eft === null) return

    navigator.clipboard.writeText(eft).then(() => {
      clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [exportEft])

  return (
    <button type="button" className="act" onClick={handleClick}>
      {copied ? 'COPIED' : 'EFT EXPORT'}
    </button>
  )
}

export default function ShipFitWheel({ killID, killmailHash }) {
  return (
    <EveDataProvider dataUrl={DATA_URL}>
      <DefaultCharactersProvider>
        <CurrentCharacterProvider initialCharacterId=".all-5">
          <DogmaEngineProvider>
            <CurrentFitProvider>
              <StatisticsProvider>
                <FitLoader killID={killID} killmailHash={killmailHash} />
                <div className="fit-layout">
                  <div className="fit-col">
                    <div className="fit-wheel-ring">
                      <ShipFit readOnly />
                    </div>
                    <EftExportButton />
                  </div>
                  <ShipStatistics />
                </div>
              </StatisticsProvider>
            </CurrentFitProvider>
          </DogmaEngineProvider>
        </CurrentCharacterProvider>
      </DefaultCharactersProvider>
    </EveDataProvider>
  )
}