import React, { useMemo } from 'react'
import { BoardEditorComponent } from '@cloud/react-board-editor-sdk'
import CloudDiagramEditor from './CloudDiagramEditor'
import { getAppConfig } from '@/utils/config'

const PREVIEW_BOARD_CONTENT = [{"agg_version":"1.16"},{"appState":{"gridSize":20,"viewBackgroundColor":"#ffffff"},"elements":["confboard#5bfe1c3f-59fa-4dbe-b5b2-b2c29af279a2","board#d8W8pWUZQ10SZ1Huvhmyb","board#AmdW4LXcmw38H2uz2VQNI","board#x0JuhKb5QMHGTxisHbj_A","board#Crkx3UoleEEF_VWiPUVio","board#M0ltLBmSeX2tBtceS2KsU"],"id":"confboard#5bfe1c3f-59fa-4dbe-b5b2-b2c29af279a2","_start":true},{"id":"d8W8pWUZQ10SZ1Huvhmyb","type":"rectangle","x":544.52197265625,"y":174.58147048950195,"width":288.5732421875,"height":149.4512939453125,"angle":0,"strokeColor":"#000000","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":0,"opacity":100,"groupIds":[],"frameId":"","index":"a0","roundness":{"type":3},"seed":1559575026,"version":30,"versionNonce":2016265902,"isDeleted":false,"boundElements":[],"updated":1776935310498,"link":"","locked":false,"strokeOpacity":100,"commentsLength":0,"commentStatus":"close"},{"id":"AmdW4LXcmw38H2uz2VQNI","type":"diamond","x":698.6885986328125,"y":130.5338478088379,"width":266.549560546875,"height":333.97508239746094,"angle":0,"strokeColor":"#000000","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":0,"opacity":100,"groupIds":[],"frameId":"","index":"a2","roundness":{"type":2},"seed":1008318638,"version":24,"versionNonce":876321966,"isDeleted":false,"boundElements":[],"updated":1776935314572,"link":"","locked":false,"strokeOpacity":100,"commentsLength":0,"commentStatus":"close"},{"id":"x0JuhKb5QMHGTxisHbj_A","type":"ellipse","x":361.1885986328125,"y":98.39099502563477,"width":731.4305419921875,"height":508.9750518798828,"angle":0,"strokeColor":"#000000","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":0,"opacity":100,"groupIds":[],"frameId":"","index":"a4","roundness":{"type":2},"seed":263025518,"version":49,"versionNonce":1164329842,"isDeleted":false,"boundElements":[],"updated":1776935318009,"link":"","locked":false,"strokeOpacity":100,"commentsLength":0,"commentStatus":"close"},{"id":"Crkx3UoleEEF_VWiPUVio","type":"arrow","x":474.87908935546875,"y":39.46242904663086,"width":495.71624755859375,"height":720.8798751831055,"angle":0,"strokeColor":"#000000","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":0,"opacity":100,"groupIds":[],"frameId":"","index":"a6","roundness":{"type":2},"seed":458416306,"version":24,"versionNonce":849888878,"isDeleted":false,"boundElements":[],"updated":1776935318676,"link":"","locked":false,"strokeOpacity":100,"commentsLength":0,"commentStatus":"close","points":[[0,0],[495.71624755859375,720.8798751831055]],"lastCommittedPoint":[],"startBinding":{},"endBinding":{},"startArrowhead":"","endArrowhead":"arrow"},{"id":"M0ltLBmSeX2tBtceS2KsU","type":"freedraw","x":1012.3790893554688,"y":56.72433090209961,"width":1180.357203245163,"height":1022.0238494873047,"angle":0,"strokeColor":"#000000","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":0,"opacity":100,"groupIds":[],"frameId":"","index":"a7","roundness":{"type":0},"seed":787564718,"version":104,"versionNonce":893398446,"isDeleted":false,"boundElements":[],"updated":1776935321043,"link":"","locked":false,"strokeOpacity":100,"commentsLength":0,"commentStatus":"close","points":[[0,0],[-5.47418212890625,-6.5011138916015625],[-9.04571533203125,-10.072532653808594],[-34.64093017578125,-18.40587615966797],[-44.16473388671875,-19.001113891601562],[-75.71240234375,-21.382049560546875],[-92.97430419921875,-19.001113891601562],[-116.78387451171875,-5.905860900878906],[-125.71240234375,2.4274749755859375],[-139.99810791015625,30.403663635253906],[-145.950439453125,51.83222198486328],[-150.1170654296875,104.21317291259766],[-150.1170654296875,138.1417465209961],[-139.99810791015625,192.30846405029297],[-97.73626708984375,270.28462982177734],[-81.66473388671875,285.1655502319336],[-46.54571533203125,304.80843353271484],[-20.355224609375,310.7607955932617],[35.00189208984375,308.37987518310547],[67.14471435546875,295.87987518310547],[93.93048095703125,278.6179428100586],[131.43048095703125,240.52269744873047],[157.02569580078125,191.7131576538086],[164.16864013671875,164.92748260498047],[165.35906982421875,147.0703353881836],[158.81146240234375,119.0941390991211],[143.33526611328125,107.78461456298828],[124.88275146484375,105.40364837646484],[99.88275146484375,105.9988784790039],[42.14471435546875,121.4750747680664],[16.54949951171875,135.1655502319336],[-53.68853759765625,179.2131576538086],[-110.8314208984375,238.1417465209961],[-155.47430419921875,301.83223724365234],[-173.9266357421875,336.95128631591797],[-187.6170654296875,378.6179428100586],[-194.760009765625,416.11791229248047],[-190.5933837890625,480.40367889404297],[-175.71240234375,515.5226974487305],[-136.4266357421875,567.3084030151367],[-104.8790283203125,591.1179122924805],[-23.92657470703125,606.594108581543],[101.66864013671875,544.094108581543],[115.35906982421875,520.2846603393555],[123.09710693359375,480.40367889404297],[118.33526611328125,461.3560104370117],[95.71624755859375,439.3322067260742],[23.69219970703125,421.47509002685547],[-60.23626708984375,428.02269744873047],[-282.855224609375,541.1179122924805],[-343.56951904296875,588.141716003418],[-435.23626708984375,670.879997253418],[-494.164794921875,739.927604675293],[-514.40283203125,775.641716003418],[-522.1409301757812,833.3798751831055],[-508.450439453125,843.498893737793],[-498.92669677734375,845.8798751831055],[-482.26007080078125,845.2845993041992],[-399.52197265625,789.927604675293],[-369.16473388671875,750.641716003418],[-346.54571533203125,710.165641784668],[-332.855224609375,673.8560104370117],[-337.61712646484375,517.3084030151367],[-356.06951904296875,492.90367889404297],[-539.40283203125,429.2131881713867],[-612.6172180175781,456.59410858154297],[-639.4029235839844,473.8560104370117],[-688.8076477050781,529.2131881713867],[-697.1410217285156,549.451286315918],[-698.3314514160156,574.451286315918],[-685.8314514160156,606.594108581543],[-636.4267272949219,641.7131881713867],[-572.1409301757812,646.4751510620117],[-483.450439453125,611.3560104370117],[-401.3076171875,538.141716003418],[-337.61712646484375,432.7845993041992],[-312.61712646484375,306.59410858154297],[-327.49810791015625,162.54650115966797],[-547.1409301757812,-120.78682136535645],[-606.6648254394531,-153.5249137878418],[-671.5457458496094,-172.5725326538086],[-725.7124328613281,-176.14397430419922],[-830.4743041992188,-155.31063079833984],[-919.7600555419922,-96.97728729248047],[-988.8076572418213,-13.048736572265625],[-1014.9981334209442,126.83223724365234],[-1004.8790860176086,176.83226776123047],[-982.8552742004395,223.85607147216797],[-901.9029159545898,319.6893539428711],[-803.6886291503906,382.7845993041992],[-754.8790588378906,401.2369613647461],[-706.6648254394531,411.35607147216797],[-523.3314819335938,371.47505950927734],[-501.30767822265625,345.8799057006836],[-488.80767822265625,304.80843353271484],[-523.3314819335938,211.35607147216797],[-560.2361755371094,169.0941390991211],[-639.4029235839844,103.02269744873047],[-672.7362060546875,80.9988784790039],[-716.1886291503906,54.213172912597656],[-744.1648254394531,41.71318817138672],[-781.0695343017578,28.617942810058594],[-781.0695343017578,28.617942810058594]],"pressures":[],"simulatePressure":true,"lastCommittedPoint":[-781.0695343017578,28.617942810058594]}]

function createBoardEditorProps() {
  const boardConfig = getAppConfig()?.editor?.board || {}
  const boardScene = boardConfig.scene || {}
  const boardMenuSetting = boardScene.menuSetting || {}
  const boardEditorConfig = boardConfig.editorConfig || {}
  const boardSecuritySettings = boardEditorConfig.securitySettings || {}

  return {
    ...boardConfig,
    url: boardConfig.editorUrl,
    scene: {
      ...boardScene,
      mode: 'preview',
      menuSetting: {
        ...boardMenuSetting,
        disableMenus: Array.from(new Set([...(boardMenuSetting.disableMenus || []), 'comment'])),
      },
    },
    collabOptions: {
      ...(boardConfig.collabOptions || {}),
      disable: true,
      server: boardConfig.collaborationUrl,
    },
    editorConfig: {
      ...boardEditorConfig,
      theme: boardEditorConfig.theme || 'auto',
      securitySettings: {
        ...boardSecuritySettings,
        displayWatermark: false,
      },
    }
  }
}

function HandwrittenEditor(props) {
  const boardEditorProps = useMemo(() => createBoardEditorProps(), [])

  return (
    <CloudDiagramEditor
      {...props}
      EditorComponent={BoardEditorComponent}
      editorKind="board"
      editorProps={boardEditorProps}
      documentData={PREVIEW_BOARD_CONTENT}
      useServerAuth={false}
      placeholder="Board editor failed to initialize. Check the board SDK, proxy, and editor URL."
    />
  )
}

export default HandwrittenEditor


