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

export default function ShipFitWheel({ killID, killmailHash }) {
  return (
    <EveDataProvider dataUrl={DATA_URL}>
      <DefaultCharactersProvider>
        <CurrentCharacterProvider initialCharacterId=".all-5">
          <DogmaEngineProvider>
            <CurrentFitProvider>
              <StatisticsProvider>
                <FitLoader killID={killID} killmailHash={killmailHash} />
                <ShipFit readOnly />
              </StatisticsProvider>
            </CurrentFitProvider>
          </DogmaEngineProvider>
        </CurrentCharacterProvider>
      </DefaultCharactersProvider>
    </EveDataProvider>
  )
}