import html2pdf from 'html2pdf.js'
import enteteImg from '../assets/ENTETE SIKApng1.png'
import piedImg from '../assets/ENTETE SIKA pied 1.png'

export const generatePDF = async (element, filename = 'document.pdf') => {
  // Créer un conteneur avec en-tête et pied de page
  const wrapper = document.createElement('div')
  wrapper.style.position = 'relative'
  wrapper.style.width = '210mm'
  wrapper.style.minHeight = '297mm'
  wrapper.style.backgroundColor = 'white'
  
  // En-tête
  const header = document.createElement('div')
  header.style.width = '100%'
  header.style.height = '25mm'
  header.style.backgroundImage = `url(${enteteImg})`
  header.style.backgroundSize = 'cover'
  header.style.backgroundPosition = 'center'
  header.style.marginBottom = '5mm'
  
  // Contenu
  const content = document.createElement('div')
  content.style.padding = '0 10mm'
  content.style.minHeight = '237mm' // 297mm - 25mm header - 15mm footer - 20mm margins
  content.appendChild(element.cloneNode(true))
  
  // Pied de page
  const footer = document.createElement('div')
  footer.style.width = '100%'
  footer.style.height = '15mm'
  footer.style.backgroundImage = `url(${piedImg})`
  footer.style.backgroundSize = 'cover'
  footer.style.backgroundPosition = 'center'
  footer.style.marginTop = '5mm'
  
  wrapper.appendChild(header)
  wrapper.appendChild(content)
  wrapper.appendChild(footer)
  
  const options = {
    margin: [0, 0, 0, 0],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  return html2pdf().set(options).from(wrapper).save()
}
