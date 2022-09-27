import React from 'react'

import { loadScene, loadDXF } from './document/io'

// @ts-ignore
import { addImage } from './draw'

import { progressCallback } from '../hooks'

export const onDrop = (e: any, container: HTMLDivElement, onProgressCallback?: progressCallback) => {
  e.preventDefault()
  e.stopPropagation()

  const canvas = container
  canvas.classList.remove('dragOver')

  // console.log (e);
  const dt = e.dataTransfer
  const files = dt.files

  // TODO: verify that these regexp are correct
  const testImage = new RegExp('([a-zA-Z0-9s_\\.-:()])+(.jpg|.jpeg|.png|.gif)$')
  const testJSON = new RegExp('([a-zA-Z0-9s_\\.-:()])+(.json)$')
  const testDXF = new RegExp('([a-zA-Z0-9s_\\.-:()])+(.dxf)$')

  if (FileReader && files && files.length &&
    testImage.test(files[0].name.toLowerCase())) {
    const fr = new FileReader()

    fr.onload = function (obj) {

      const image = new Image()
      image.src = fr.result as string

      image.onload = function () {
        const dims = {
          // @ts-ignore
          width: this.width,
          // @ts-ignore
          height: this.height,
        }

        const rect = canvas.getBoundingClientRect()

        const evPt = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }

        // @ts-ignore
        addImage(this.src, dims, evPt)
      }
    }
    fr.readAsDataURL(files[0])
  } else if (FileReader && files && files.length &&
    testJSON.test(files[0].name.toLowerCase())) {

    const fr = new FileReader()

    fr.onload = function (e) {

      let result = fr.result

      if (typeof result === 'string') {
        result = JSON.parse(result.slice())
      }

      // @ts-ignore
      loadScene(result, onProgressCallback)
    }
    fr.readAsText(files[0])
  } else if (FileReader && files && files.length &&
    testDXF.test(files[0].name.toLowerCase())) {

    const fr = new FileReader()

    fr.onload = function (e) {

      const result = fr.result

      if (typeof result !== 'string') return

      loadDXF(result, onProgressCallback)
    }
    fr.readAsText(files[0])
  } else {
    //failure message, toast em prolly
    console.log('media import failed!')
  }
}