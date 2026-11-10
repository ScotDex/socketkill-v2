import React from 'react'
import wasmUrl from '@eveshipfit/dogma-engine/esf_dogma_engine_bg.wasm?url'
import imagesUrl from '@eveshipfit/images/dist/images.dat?url'
import sdeUrl from '@eveshipfit/sde/dist/sde.dat?url'
import '@eveshipfit/ui-ingame/theme.css'
import { createEngine } from '@eveshipfit/fitting'
import { loadImages } from '@eveshipfit/images'
import { loadSde } from '@eveshipfit/sde-loader'
import { Esi } from '@eveshipfit/esi'
import { EveShipFitProvider, ImagesProvider } from '@eveshipfit/react-hooks'
import { FittingWheel } from '@eveshipfit/ui-ingame'


let enginePromise = null
function getEngine() {
  if (!enginePromise) {
    const esi = new Esi({ userAgent: 'SocketKill/1.0 (Dex; +https://socketkill.com)' })
    enginePromise = Promise.all([
      loadSde({ url: sdeUrl }).then((sde) => createEngine(sde, { wasm: wasmUrl, esi })),
      loadImages({ url: imagesUrl }, { baseUrl: '/esf-images/' }),
    ])
      .then(([engine, images]) => ({ engine, images }))
      .catch((err) => {
        enginePromise = null 
        throw err
      })
  }
  return enginePromise
}

function EftExportButton({ engine, fit }) {
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef(null)

  React.useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleClick = React.useCallback(() => {
    const eft = engine.saveText(fit, 'eft')
    if (!eft) return

    navigator.clipboard.writeText(eft).then(() => {
      clearTimeout(timerRef.current)
      setCopied(true)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [engine, fit])

  return (
    <button type="button" className="act" onClick={handleClick}>
      {copied ? 'COPIED' : 'EFT EXPORT'}
    </button>
  )
}

export default function ShipFitWheel({ killID, killmailHash }) {
  const [state, setState] = React.useState({ status: 'loading' })

  React.useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    getEngine()
      .then(async ({ engine, images }) => {
        const fit = await engine.loadLink(`killmail:${killID}/${killmailHash}`)
        if (!fit) throw new Error('Killmail fit could not be loaded')
        if (!cancelled) {
          setState({ status: 'ready', engine, images, fit, store: engine.createFit(fit) })
        }
      })
      .catch((err) => {
        console.error('[ShipFitWheel]', err)
        if (!cancelled) setState({ status: 'error' })
      })

    return () => { cancelled = true }
  }, [killID, killmailHash])

  if (state.status === 'loading') return <div className="fit-status">LOADING FIT…</div>
  if (state.status === 'error') return <div className="fit-status">FIT UNAVAILABLE</div>

  const { engine, images, fit, store } = state
  return (
    <ImagesProvider images={images}>
      <EveShipFitProvider key={killID} engine={engine} fit={store}>
        <div className="fit-layout">
          <div className="fit-col">
            <div className="fit-wheel-ring">
              <FittingWheel readOnly />
            </div>
            <EftExportButton engine={engine} fit={fit} />
          </div>
        </div>
      </EveShipFitProvider>
    </ImagesProvider>
  )
}