/// <reference types="cypress" />

const path = require('path');

let accessibilityContext
let accessibilityOptions
let impactStyling


// Global variable to store the current test results
let testResults
// Global variable to store the current suite results after all te4sts are completed
let specResults


//*******************************************************************************
// FOR MULTIPLE ATTEMPTS CASES
//*******************************************************************************

let reportIdGlobal = ''


//*******************************************************************************
// FOR SPEECH SYNTHESIS
//*******************************************************************************

const wickVoice = window.speechSynthesis;


//*******************************************************************************
// PUBLIC FUNCTIONS
//*******************************************************************************

/**
 * Logs the accessibility violations in Cypress Log and Browser Console.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @returns {Array} - The sorted array of accessibility violations.
 */
export const logViolations = (violations) => {
    // Log the accessibility violations in Cypress Log and the Browser Console
    recordViolations(violations, true)
}


/**
 * Logs the accessibility violations in Cypress Log and Browser Console and generates an HTML report with them.
 * 
 * @param {Array} violations - The array of accessibility violations.
 */
export const logViolationsAndGenerateReport = (violations) => {
    // Log the accessibility violations in Cypress Log and the Browser Console
    const violationsSorted = recordViolations(violations, false)

    // Log the accessibility violations in the HTML report
    recordViolations_Report(violationsSorted)

    // Log summary of violations at the end of the Cypress log if we are generating a report
    recordViolationsSummaryTotals_CypressLog(violationsSorted)
}


//*******************************************************************************
// PRIVATE FUNCTIONS AND CONSTANTS
//*******************************************************************************

/**
 * The default folder path for storing accessibility reports.
 * @type {string}
 */
const defaultAccessibilityFolder = 'cypress/accessibility'

/**
 * Array representing the priority levels of accessibility violations,
 * with the first element being the highest priority and the last element
 * being the lowest priority.
 * 
 * @type {string[]}
 */
const impactPriority = ['critical', 'serious', 'moderate', 'minor'];

/**
 * Object representing the dewfault impact styling for accessibility violations based in the severity level.
 * @typedef {Object} defaultImpactStyling
 * 
 * @property {Object} critical - The critical impact indicator.
 * @property {string} critical.icon - The icon for the critical impact indicator.
 * @property {string} critical.color - The color for the critical impact indicator.
 * @property {Object} serious - The serious impact indicator.
 * @property {string} serious.icon - The icon for the serious impact indicator.
 * @property {string} serious.color - The color for the serious impact indicator.
 * @property {Object} moderate - The moderate impact indicator.
 * @property {string} moderate.icon - The icon for the moderate impact indicator.
 * @property {string} moderate.color - The color for the moderate impact indicator.
 * @property {Object} minor - The minor impact indicator.
 * @property {string} minor.icon - The icon for the minor impact indicator.
 * @property {string} minor.color - The color for the minor impact indicator.
 * @property {Object} fixme - The fixme impact indicator.
 * @property {string} fixme.icon - The icon for the fixme impact indicator.
 */
const defaultImpactStyling = {
    critical: { icon: '🟥', style: 'fill: #DE071B; fill-opacity: 0; stroke: #DE071B; stroke-width: 10;' },
    serious: { icon: '🟧', style: 'fill: #FFA66A; fill-opacity: 0; stroke: #FFA66A; stroke-width: 10;' },
    moderate: { icon: '🟨', style: 'fill: #ECDE05; fill-opacity: 0; stroke: #ECDE05; stroke-width: 10;' },
    minor: { icon: '🟦', style: 'fill: #4598FF; fill-opacity: 0; stroke: #4598FF; stroke-width: 10;' },
    fixme: { icon: '🛠️' }
}


const impactSeverityDescription = {
    critical: `A 'critical' accessibility violation represents a significant barrier that prevents users with disabilities
               from accessing core functionality or content.<br>For example, images must have alternate text (alt text) to
               ensure that visually impaired users can understand the content of the images through screen readers.
               Missing alt text on critical images can be a substantial obstacle to accessibility.`,
    serious: `A 'serious' accessibility violation significantly degrades the user experience for individuals with disabilities
               but does not completely block access.<br>For instance, elements must meet minimum color contrast ratio thresholds.
               If text and background colors do not have sufficient contrast, users with visual impairments or color blindness may
               find it difficult to read the content.`,
    moderate: `A 'moderate' accessibility violation impacts the user experience but with less severe consequences.
               These issues can cause some confusion or inconvenience.<br>For example, all page content should be contained by landmarks.
               Properly defining landmarks (like header, main, nav) helps screen reader users to navigate and understand the structure
               of the page better.`,
    minor: `A 'minor' accessibility violation has a minimal impact on accessibility. These issues are typically more related to best
               practices and can slightly inconvenience users.<br>For instance, the ARIA role should be appropriate for the element means
               that ARIA roles assigned to elements should match their purpose to avoid confusion for screen reader users, though it does
               not significantly hinder access if not perfectly used.`
}

/**
 * Defines the scope considered in the accessibility analysis.
 * @type {string}
 */
const contextHelp = 'Context defines the scope considered in the accessibility analysis, specifying which elements have been tested and which have not been tested.'

/**
 * Tags define the severity of violations that have been considered in the accessibility analysis.
 * @type {string}
 */
const runOnlyHelp = 'Tags define the severity of violations that have been considered in the accessibility analysis.'

/**
 * Defines what specific accessibility rules should be enabled or disabled for the analysis.
 * @type {string}
 */
const rulesHelp = 'Rules define what specific accessibility rules should be enable or disabled for the analysis, like "color-contrast" or "valid-lang".'


/**
 * Sorts the validations by severity.
 *
 * @param {Object} a - The first validation object.
 * @param {Object} b - The second validation object.
 * @returns {number} - The comparison result.
 */
const sortValidationsBySeverity = (a, b) => {
    let aIndex = impactPriority.indexOf(a.impact)
    let bIndex = impactPriority.indexOf(b.impact)
    if (aIndex > bIndex)
        return 1;
    if (aIndex < bIndex)
        return -1;
    return 0;
}

/**
 * Logs the accessibility violations in Cypress Log and Browser Console.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @param {boolean} [logSummary=true] - Whether to log the summary of violations in Cypress log.
 * @returns {Array} - The sorted array of accessibility violations.
 */
const recordViolations = (violations, logSummary = true) => {
    // Retrieve the accessibility context and options
    accessibilityContext = Cypress.env('accessibilityContext')
    accessibilityOptions = Cypress.env('accessibilityOptions') || {}
    impactStyling = Cypress._.merge({}, defaultImpactStyling, accessibilityOptions.impactStyling)

    // Calculate the summary totals of violations by severity
    testResults = {
        testSummary: calculateViolationsSummaryBySeverity(violations),
        violations
    }

    // Sort the violations by severity
    const violationsSorted = violations.sort(sortValidationsBySeverity)

    // Log in the Cypress Log the accessibility violations
    recordViolations_CypressLog(violationsSorted)

    // Log in the Browser console the accessibility violations as a table
    recordViolations_Console(violationsSorted)

    // Log summary of violations at the end of the Cypress log if we are not generating a report
    if (logSummary) {
        recordViolationsSummaryTotals_CypressLog(violationsSorted)
    }

    return violationsSorted
}

/**
 * Calculates the summary of accessibility violations by severity.
 * 
 * @param {Array} violations - The array of accessibility violations.
 * @returns {Object} - The object containing the summary of violations by severity.
 */
const calculateViolationsSummaryBySeverity = (violations) => {
    let totals = {}
    impactPriority.forEach((impact) => {
        if (accessibilityOptions.includedImpacts.includes(impact)) {
            totals[impact] = violations.filter(v => v.impact === impact).length
        }
    })
    return totals
}

/**
 * Records a summary of the accessibility violations by severity in the Cypress log.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolationsSummaryTotals_CypressLog = (violations) => {
    cy.then(() => {
        for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
            Cypress.log({
                name: `• ${impact.toUpperCase()} VIOLATIONS ${impactStyling[impact].icon}:`,
                message: `${totalPerImpact}`,
                consoleProps: () => ({
                    total: totalPerImpact,
                    violations: violations.filter(v => v.impact === impact),
                })
            })
        }
    })
}

/**
 * Records accessibility violations in the Cypress log.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_CypressLog = (violations) => {
    cy.document().then(doc => {
        createViolationCssStyles(doc)

        const fixmeIcon = impactStyling.fixme.icon

        // Log violations in Cypress Log
        violations.forEach(violation => {
            const impact = violation.impact
            const impactIcon = impactStyling[impact].icon

            // nodes variable will store CSS selector for all the violation nodes (to highlight all of them when clicked the violation on the Cypress Log)
            const nodes = Cypress.$(violation.nodes.map((node) => node.target).join(','))

            // Log accessbility violation (impact) - Type of violation
            Cypress.log({
                name: `[${impactIcon}${impact.toUpperCase()}]`,
                message: `**${violation.help.toUpperCase()} _(Rule ID: ${violation.id})_.** [More info](${violation.helpUrl})`,
                $el: nodes,
                consoleProps: () => violation,
            })

            // Log all the individual violations (target) - Elements to fix
            violation.nodes.forEach(node => {
                const target = node.target // CSS selector (to highlight all of them when clicked the violation on the Cypress Log)
                const $elem = Cypress.$(target.join(','))

                // Log accessbility violation (for each HTML element
                Cypress.log({
                    name: `---(${fixmeIcon}Fixme)▶`,
                    $el: $elem,
                    message: target,
                    consoleProps: () => node,
                })

                // Flag the element with the violation in Cypress runner page
                flagViolationOnPage(doc, $elem[0], violation, node)
            })
        })
    })
}


/**
 * Logs accessibility violations in the console.
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_Console = (violations) => {
    // Log in the console summary of violations
    let violationsSummary = `\n************************ ACCESSIBILITY RESULTS FOR TEST "${Cypress.currentTest.title}"\n\n`
    for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
        violationsSummary += `${impact.toUpperCase()} VIOLATIONS: ${totalPerImpact}\n`

    }
    cy.task('logViolationsSummary', violationsSummary)

    // Log in the console all the violations data
    const violationData = violations.map(({ id, impact, tags, description, nodes, help, helpUrl }) => ({
        //TOTAL: nodes.length,
        IMPACT: `${impact.toUpperCase()}`,
        RULEID: `${id} (${help})`,
        TAGS: `${tags.join(", ")}`,
        SELECTORS: `${nodes.map((node) => node.target).join(', ')}`,
        DESCRIPTION: `${description}`,
        MOREINFO: `${helpUrl}`,
    }))
    cy.task('logViolationsTable', violationData)
}

/**
 * Records the accessibility violations and generates an HTML report with the violations detected.
 * The report includes a screenshot of the page with the elements that have violations highlighted in different colors based on severity.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_Report = (violations) => {

    cy.url({ log: false }).then(url => {
        const day = new Date()
        const reportGeneratedOn = day.toString()
        const fileDate = day.toLocaleString({ timezone: "short" }).replace(/\//g, '-').replace(/:/g, '_').replace(/,/g, '')

        const testSpec = Cypress.spec.name
        const testName = Cypress._.last(Cypress.currentTest.titlePath)

        // Accessibility folder
        const accessibilityFolder = Cypress.config('accessibilityFolder') || defaultAccessibilityFolder
        // const reportId = normalizeFileName(`Accessibility Report --- ${testSpec} --- ${testName} (${fileDate})`)

        // Report Id folder
        const attempt = Cypress.currentRetry
        let reportId
        if (attempt === 0) {
            reportIdGlobal = normalizeFileName(`Accessibility Report --- ${testSpec} --- ${testName} (${fileDate})`)
            reportId = reportIdGlobal
        } else {
            reportId = `${reportIdGlobal} (attempt ${attempt + 1})`
        }

        const reportFolder = `${accessibilityFolder}/${reportId}`

        // Generate the HTML report with the violations detected, including screenshot of the page with the elements vith violations highlighted in different colors based on severity
        cy.task('createFolderIfNotExist', `${reportFolder}`).then(() => {

            // Generate screenshot of the page
            const issuesScreenshotFilePath = takeScreenshotsViolations(reportId, reportFolder)

            // Build the content of the HTML report
            const fileBody = buildHtmlReportBody(violations, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath })

            // Generate the HTML report
            const file = { folderPath: reportFolder, fileName: 'Accessibility Report.html', fileBody }
            cy.task('generateViolationsReport', file).then((result) => {
                console.log(result)
                cy.log(result)
            })
        })
    })
}

/**
 * Takes screenshot of accessibility violations and moves them to the accessibility results folder.
 *
 * @param {string} reportId - The ID of the accessibility report.
 * @param {string} reportFolder - The folder where the screenshots will be moved to.
 * @returns {string} - The filename of the moved screenshot.
 */
const takeScreenshotsViolations = (reportId, reportFolder) => {
    // reportId - E.g. 'Accessibility Report --- accessibility-tests-samples.js --- Test Sample Page Accessibility (6-23-2024 3_13_03 PM)'
    // reportFolder - E.g. 'cypress/accessibility/Accessibility Report --- accessibility-tests-samples.js --- Test Sample Page Accessibility (6-23-2024 3_13_03 PM)'

    const attempt = Cypress.currentRetry
    const attemptSuffix = attempt > 0 ? ` (attempt ${attempt + 1})` : ''

    const issuesFileNameOrigin = `${reportId} Accessibility Issues Image`
    const issuesFileNameTarget = `Accessibility Issues Image`

    setViolationsHover('disabled')
    cy.screenshot(`${issuesFileNameOrigin}`, { capture: 'fullPage' })
    setViolationsHover('enabled')

    let subFolder = ''
    if (!Cypress.config('isInteractive')) {
        subFolder = `${Cypress.spec.name}/` // If executed in run mode it creates a folder with test name for the screenshots
    }

    const targetFileName = `${issuesFileNameTarget}${attemptSuffix}.png`

    const originFilePath = `${Cypress.config('screenshotsFolder')}/${subFolder}${issuesFileNameOrigin}${attemptSuffix}.png`
    const targetFilePath = `${reportFolder}/${targetFileName}`

    cy.task('moveScreenshotToFolder', { originFilePath, targetFilePath }).then((result) => {
        console.log(result)
    })

    return targetFileName
}

/**
 * Sets the hover class for the severity rectangles.
 *
 * @param {string} className - The class name to be set: 'enabled', 'disabled'.
 */
const setViolationsHover = (className) => {
    cy.then(() => {
        Cypress.$('.severity rect').attr('class', className)
    })
}

/**
 * Builds the HTML report body for accessibility violations.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @param {Object} options - The options for building the report body.
 * @param {string} options.testSpec - The test spec (test file).
 * @param {string} options.testName - The name of the test with the accessibility analysis is performed
 * @param {string} options.url - The URL of the page being tested.
 * @param {string} options.reportGeneratedOn - The date and time when the report was generated.
 * @param {string} options.issuesScreenshotFilePath - The file path of the screenshot showing the accessibility violations.
 * @returns {string} The HTML report body.
 */
const buildHtmlReportBody = (violations, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath }) => {
    const fileBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Report (Axe-core®)</title>
        <style>
            * {
                box-sizing: border-box;
            }

            #root,body,html {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 0.95em;
            }

            .header {
                font-size: 2.3em;
            }

            /* Summary bubbles */
            .summary {
                font-size: 1.2em;
                line-height: 18px;               
            }

            .row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                margin-bottom: 10px;

                padding-top: 5px;
            }

            /* Clear floats after the columns */
            .row:after {
                content: "";
                display: table;
                clear: both;
            }

            /* Create two equal columns that floats next to each other */
            .column {
                float: left;
                padding: 0px 10px;
                line-height: 100%;
                border-radius: 10px;
                margin: 0px 5px;
                word-break: break-word;
            }

            .single_column {
                /* Firefox */
                width: -moz-calc(100% - 10px);
                /* WebKit */
                width: -webkit-calc(100% - 10px);
                /* Opera */
                width: -o-calc(100% - 10px);
                /* Standard */
                width: calc(100% - 10px);

                margin-bottom: 12px;
            }

            /* List style */
            li { margin-bottom: 1rem; }

            /* Tooltip container */
            .tooltip {
                position: relative;
                display: inline-block;
                border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
            }

            .tooltip:hover {
                /*position: relative;
                display: inline-block;*/
                border-bottom: 1px dotted #0000FF; /* If you want dots under the hoverable text */
                color: #0000FF;
            }

            /* Tooltip text */
            .summary .tooltip .tooltiptext {
                font-size: 0.75em;
                max-width: 600px
            }

            .tooltip .tooltiptext {
                visibility: hidden;

                /* Tooltip box */
                width: max-content !important;
                background-color: #555555;
                color: #fff;
                text-align: left;
                padding: 10px;
                border-radius: 6px;

                /* Position the tooltip text */
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                margin-left: -20px;

                /* Fade in tooltip */
                opacity: 0;
                transition: opacity 0.3s;
            }

            /* Tooltip arrow */
            .tooltip .tooltiptext::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 20px;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #555 transparent transparent transparent;
            }

            /* Show the tooltip text when you mouse over the tooltip container */
            .tooltip:hover .tooltiptext {
                visibility: visible;
                opacity: 1;
            }
                
            /* Screenshot image */
            .imagecontainer {
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
            }
            
            .image {
                border: 2px solid;
                padding: 10px;
                box-shadow: 6px 4px 8px;
                border-radius: 8px;
            }

            /* Footer */
            .footer {
                text-align: center;
                margin: 10px 0px;
            }
        </style>
    </head>
    <body>
        <div role="main">
            <h1 class="header">Accessibility Report (Axe-core®)</h1>
            <hr/>

            <div class="row" role="region" aria-label="Main Summary">
                <div class="column" style="background-color:#cce6ff; height: 100%;"  aria-label="Test Summary">
                    <p class="summary"><strong>Spec: </strong>${escapeHTML(testSpec)}</p>
                    <p class="summary"><strong>Test: </strong>${escapeHTML(testName)}</p>
                    <p class="summary"><strong>Page URL: </strong>
                        <a href="${url}" target="_blank">${escapeHTML(url)}</a>
                    </p>
                    <p class="summary"><strong>Generated on: </strong>${reportGeneratedOn}</p>
                </div>
                <div class="column" style="background-color:#cce6ff; height: 100%;" aria-label="Violations Summary by Severity">
                    ${impactPriority.map((impact) => {
        const totalIssues = testResults.testSummary[impact] !== undefined ? testResults.testSummary[impact] : 'n/a'
        return `<p class="summary">${impactStyling[impact].icon} <strong>
                            <span aria="tooltip" class="tooltip">${impact.toUpperCase()}
                                <span class="tooltiptext">${impactSeverityDescription[impact]}</span>
                            </span>: </strong>${totalIssues}
                        </p>`
    }).join('')}
                </div>
            </div>
            <div class="single_column column" style="background-color:#e6f3ff; height: 100%;" role="region" aria-label="Analysis Conditions Summary">
                <!-- Context -->
                <p class="summary"><strong>
                    <span aria="tooltip" class="tooltip">Context
                        <span class="tooltiptext">${contextHelp}</span>
                    </span>: </strong>${getHumanReadableFormat(accessibilityContext)}
                </p>

                <!-- Severity (runOnly) -->
                <p class="summary"><strong>
                    <span aria="tooltip" class="tooltip">Tags
                        <span class="tooltiptext">${runOnlyHelp}</span>
                    </span>: </strong>${accessibilityOptions.runOnly.join(', ')}
                </p>

                <!-- Rules -->
                ${accessibilityOptions.rules ?
            `<p class="summary"><strong>
                        <span aria="tooltip" class="tooltip">Rules
                            <span class="tooltiptext">${rulesHelp}</span>
                        </span>: </strong>${getHumanReadableFormat(accessibilityOptions.rules)}
                    </p>` : ''
        }
            </div>
            <hr/>
            <h2 role="heading" >Accessibility Violations Details</h2>
            <ul>
                ${violations
            .map(
                (violation) => `
                <li>
                    <strong>[${impactStyling[violation.impact].icon}${violation.impact.toUpperCase()}]: ${escapeHTML(violation.help.toUpperCase())}<i> (Rule ID: ${escapeHTML(violation.id)})</i></strong>
                    <a href="${violation.helpUrl}" target="_blank">More info</a>
                    <br>
                    <strong><p>Tags: ${violation.tags.join(", ")}</p></strong>
                    <ul>
                    ${violation.nodes.map((node) => `
                        <li>
                            (${impactStyling.fixme.icon}Fixme)▶ 
                            <div aria="tooltip" class="tooltip">${node.target}
                                <span class="tooltiptext">${getFailureSummaryTooltipHtml(node.failureSummary)}</span>
                            </div>
                        </li>`
                ).join("")}
                    </ul>
                </li>`
            ).join("")}
            </ul>
            <hr/>

            <h2 role="heading" id="violations-screenshot">Accessibility Violations Screenshot</h2>
            <div role="img" aria-labelledby="violations-screenshot" class="imagecontainer">
                <img width="98%" class="image" src="${issuesScreenshotFilePath}" alt="Accessibility Violations Screenshot Colored by Severity" />
            </div>
            <hr/>

            <p class="footer">🎓 As per the axe-core® library: it can find on average 57% of WCAG issues automatically; it also only analyzes DOM elements that are visible in the browser viewport. 
Axe-core® <https://github.com/dequelabs/axe-core> is a trademark of Deque Systems, Inc <https://www.deque.com/>. in the US and other countries.</p>
        </div>
    </body>
    </html>
    `
    return fileBody
}

/**
 * Escapes special characters in a string to their corresponding HTML entities.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeHTML = (str = '') =>
    str.replace(
        /[&<>'"]/g,
        tag =>
        ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    )

/**
 * Returns a formatted tooltip for the failure summary on the Report.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted tooltip string.
 */
const getFailureSummaryTooltipHtml = (summary) => {
    // return summary.split('\n').join('<br>&nbsp;&nbsp;&nbsp;- ')

    return summary.split('\n').map((line, index) => {
        if (/^Fix/.test(line)) {
            return line;
        }
        return `&nbsp;&nbsp;&nbsp;- ${line}`
    }).join('<br>')
}

/**
 * Returns a formatted tooltip for the failure summary on the Screen.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted tooltip string.
 */
const getFailureSummaryTooltipScreen = (summary) => {
    // return summary.split('\n').join('<br>&nbsp;&nbsp;&nbsp;- ')

    return summary.split('\n').map((line, index) => {
        if (/^Fix/.test(line)) {
            return line;
        }
        return `      • ${line}`
    }).join('\n')
}

/**
 * Returns the context parameter of the accessibility analysis as a string human-readable format.
 *
 * @param {Element|NodeList|Object|Array|String|null} context - The context parameter.
 * @returns {string} The context as a human-readable string.
 */
const getHumanReadableFormat = (context) => {
    if (context == null) {
        return '(Entire document)'

    } else if (Cypress._.isElement(context)) {
        return escapeHTML(`${context.outerHTML.split('>')[0]}>...</${context.tagName.toLowerCase()}>`)

    } else if (Cypress._.isArray(context) || isNodeList(context)) {
        return Array.from(context).map((elem) => getHumanReadableFormat(elem)).join(', ')

    } else if (Cypress._.isPlainObject(context)) {
        let intermediateString = JSON.stringify(context).replace(/\\"/g, '__TEMP_ESCAPED_QUOTE__');
        let singleQuoteJsonString = intermediateString.replace(/"([^"]*?)"/g, (match, p1) => {
            return `'${p1}'`;
        });
        return singleQuoteJsonString.replace(/__TEMP_ESCAPED_QUOTE__/g, '"');

    } else {
        return context + ''
    }
}


/**
 * Checks if the given object is a NodeList.
 *
 * @param {Object} obj - The object to be checked.
 * @returns {boolean} - Returns true if the object is a NodeList, false otherwise.
 */
const isNodeList = (obj) => {
    return Object.prototype.toString.call(obj) === '[object NodeList]';
}


/**
 * Calculates the total number of issues for a specific impact level.
 *
 * @param {Array} violations - An array of accessibility violations.
 * @param {string} impact - The impact level to filter the violations.
 * @returns {number} - The total number of issues with the specified impact level.
 */
const getTotalIssuesForImpact = (violations, impact) => {
    return accessibilityOptions.includedImpacts.includes(impact) ? violations.filter(v => v.impact === impact).length : 'n/a'
}

/**
 * Highlights a violation by creating a div element with an SVG rectangle inside it.
 * The div element is positioned at the location of the specified element and is styled
 * with the specified color, and inserted with higher zIndex based on the impact level.
 *
 * @param {Document} doc - The document object.
 * @param {Element} elem - The element to highlight.
 * @param {Object} violation - The accessibility violation.
 * @param {Object} node - The node being processed for the violation.
 * @returns {HTMLDivElement} - The created div element.
 */
const flagViolationOnPage = (doc, elem, violation, node) => {
    const { impact, description, help } = violation
    const { failureSummary, html, target } = node
    const impactIcon = impactStyling[impact].icon

    // Get the bounding rectangle of the element
    const boundingRect = elem.getBoundingClientRect()

    // SVG Namespace
    const namespaceURI = 'http://www.w3.org/2000/svg'

    // DIV (wrapper to show in the right place the highlighted element when click in CY Log)
    const div = document.createElement(`div`)
    div.className = `${impact} severity${target.includes('html') ? ' send-back' : ''}`
    div.setAttribute('data-impact', impact)
    div.setAttribute('style', `width: ${boundingRect.width}px; height: ${boundingRect.height}px; top: ${boundingRect.y}px; left: ${boundingRect.x}px;`)

    // SVG
    const svg = document.createElementNS(namespaceURI, 'svg')

    // RECT
    const rect = document.createElementNS(namespaceURI, 'rect');
    rect.setAttribute('class', `enabled`)
    rect.setAttribute('x', '0')
    rect.setAttribute('y', '0')
    rect.setAttribute('rx', '10')
    rect.setAttribute('ry', '10')

    // TOOLTIP
    const tooltipInfo = {
        impact,  // E.g. 'serious'
        description,
        help,
        failureSummary,
        html,
        fixme: target,
        impactIcon
    }

    const tooltip = document.createElementNS(namespaceURI, 'title');
    const tooltipMessage = getTooltipViolation(tooltipInfo)

    tooltip.innerHTML = tooltipMessage

    // Append DOM elements to the document
    rect.appendChild(tooltip);
    svg.appendChild(rect);
    div.appendChild(svg);
    doc.body.appendChild(div)

    return div
}

/**
 * Generates a tooltip violation message for the screen.
 *
 * @param {Object} tooltipInfo - The tooltip violation info.
 * @param {string} tooltipInfo.impact - The impact of the violation.
 * @param {string} tooltipInfo.description - The description of the violation.
 * @param {string} tooltipInfo.help - The help information for the violation.
 * @param {string} tooltipInfo.failureSummary - The failure summary of the violation.
 * @param {string} tooltipInfo.html - The HTML code related to the violation.
 * @param {string} tooltipInfo.fixme - The target information for the violation.
 * @param {string} tooltipInfo.impactIcon - The icon representing the impact of the violation.
 * @returns {string} The tooltip violation message.
 */
const getTooltipViolation = ({ impact, description, help, failureSummary, html, fixme, impactIcon }) => {
    return `
💥 Impact ➜ ${impactIcon} ${impact.toUpperCase()}
💬 Help ➜ ${escapeHTML(help.toUpperCase())}
🏷️ Description ➜ ${escapeHTML(description)}
🛠️ Fixme ➜ ${fixme}
📃 Failure Summary ➜ ${getFailureSummaryTooltipScreen(failureSummary)}
`
}


/**
 * Replaces special characters in a file name with underscores.
 *
 * @param {string} fileName - The original file name.
 * @returns {string} The normalized file name with special characters replaced by underscores.
 */
const normalizeFileName = (fileName) => {
    return fileName.replace(/\/|\\|\?|\:|\*|\"|\<|\>|\|/g, "_")
}


/**
 * Creates and appends CSS styles for violation elements based on their impact priority.
 * @param {Document} doc - The document object where the styles will be appended.
 */
const createViolationCssStyles = (doc) => {
    const styles = document.createElement('style')

    styles.textContent = impactPriority.map((impact, priority) => {
        const zIndex = 2147483647 - priority * 10
        const style = impactStyling[impact].style

        return `
            /* Violation style by severity */
            .${impact} {
                z-index: ${zIndex};
                position: absolute;
                margin: 0px;
                padding: 0px;
            }
            .${impact} rect {
                width: 100%;
                height: 100%;
                ${style}
            }
        `
    }).join(' ') + `
        .send-back {
            z-index: 2147482647 !important;
        }

        /* SVG everity */
        .severity svg {
            width: 100%;
            height: 100%;
        }
        /* Highlight sytyle when mouse over the violation */
        .severity rect.enabled:hover {
            fill: #FF00FF;
            fill-opacity: 0.3;
        }

        /* Disable highlight */
        .severity rect.disabled:hover {
            fill-opacity: 0;
        }

        /* CYPRESS CSS OVERRIDE - highlight to look same as rect:hover */
        [data-highlight-el] {
            z-index: 2147483597 !important;
            opacity: 0.4 !important;
        }
        [data-highlight-el] [data-layer] {
            z-index: 2147483597 !important;
            background-color: #FF00FF !important;
            opacity: 0.3 !important;
        }
        [data-highlight-el] [data-layer="Content"] {
            opacity: 0 !important;
        }
    `

    Cypress.$(doc.head).append(styles)
}


//*******************************************************************************
// DATA FOR ACCESSIBILITY VIOLATIONS VOICE MESSAGES
//*******************************************************************************

before(() => {
    // Delete spec summary voice buttons for the previous run
    Cypress.$('.spec-summary-voice-control', window.top?.document).remove()

    // Empty stored results in the forst test of the suite
    if (cy.state().test.order === 1) {
        cy.task('emptySpecResults')
    }
})

/**
 * Before each test start to run it cancels any voice message that might still being played and resets the test results for the next test to run.
 */
Cypress.on('test:before:run', (testAttr, test) => {
    if (mustEnableVoice()) {
        wickVoice.cancel()
        testResults = {}
    }
})

Cypress.on('test:after:run', (testAttr, test) => {
    if (mustEnableVoice()) {
        const lastTest = test.order === Cypress.$('.test', window.top?.document).length
        if (lastTest) {
            // Last test in the suite

            // Figure out number of pending tests (last piece missing) and complete the total count
            const pendingTests = Cypress.$('.runnable-pending', window.top?.document).length
            specResults.specSummary.pending = pendingTests
            specResults.specSummary.tests += pendingTests

            createTestVoiceControlsInCypressLog()
            captureEventsForCollapsibleElements()
        }
    }
})

/**
 * After each test case if run create the voice messages for that test and save results for later use.
 */
afterEach(() => {
    if (mustEnableVoice()) {
        const test = cy.state().test

        testResults.testTitle = test.title
        testResults.testState = test.state
        testResults.testSummaryVoice = obtainTestSummaryVoiceMessage(test)
        testResults.violationsResults = obtainViolationsResultsVoiceMessage(testResults.violations)

        cy.task('saveTestResults', Cypress._.cloneDeep(testResults))
    }
})

/**
 * After all tests are run create the voice messages, add the voice buttons styles to the page and create the voice buttons in the Cypress log.
 */
after(() => {
    if (mustEnableVoice()) {
        createVoiceCssStyles()

        cy.task('getSpecResults').then((theSpecResults) => {
            specResults = theSpecResults
        })
    }
})

const captureEventsForCollapsibleElements = () => {
    Cypress.$('main .collapsible-header', window.top?.document).each((index, collapsible) => {

        // Get the original click handler
        const originalClickHandler = collapsible.onclick;
        
        collapsible.onclick = function (event) {
            // console.log('====== collapsible.onclick')
            if (originalClickHandler) {
                // Call the original click handler if existed
                originalClickHandler(event);
            }

            if (collapsible.getAttribute('aria-expanded') === 'false') {
                // console.log('====== a')
                // Action of expand (before expanding is false, and at this point is not fully expanded yet)

                setTimeout(() => {
                    // Get tests in case the collapsible is a describe or context block
                    let $tests = Cypress.$(collapsible).parent().next().find(' .runnable-title>span:nth-child(1)')

                    if ($tests.length === 0) {
                        // Is already a test or another collapsible without tests
                        // console.log('---1')

                        const $test = Cypress.$(collapsible).find(' .runnable-title>span:nth-child(1)')
                        const testTitle = $test.text()
                        const skipVoiceForTestHeader = testTitle ? true : false // We are expanding already a test so skip the voice buttons for the test header

                        createTestVoiceControlsInCypressLog(testTitle, skipVoiceForTestHeader)
                    } else {
                        // It is a describe or context block with tests inside
                        $tests.each((index, test) => {
                            // console.log('---2')
                            const testTitle = Cypress.$(test).text()
                            createTestVoiceControlsInCypressLog(testTitle)
                        })
                    }
                }, 250); // Give some time to the UI component to create and render the childern elements (childern contexts and tests)
            } else {
                // console.log('====== b')
                // Action of colapse (before colapsing, it  is true, and at this point is not fully ecollapsed yet)

                const doc = window.top?.document

                // Cancel any previous voice message
                wickVoice.cancel()

                // Hide any other voice buttons that is not Play from other voice groups
                // (this is for the case when a voice message is playing and the user clicks play on a different voice message)
                Cypress.$(`.voice-play`, doc).removeClass('voice-hidden')
                Cypress.$(`.voice-pause, .voice-resume, .voice-stop`, doc).addClass('voice-hidden')
            }
        }
    })
}



const obtainSpecSummaryVoiceMessage = () => {
    const summary = specResults.specSummary
 
    return `
        The spec with name ${specResults.specName} ran ${summary.tests} ${pluralizedWord('test', summary.tests)} in total:
        ${summary.passed} ${pluralizedWord('test', summary.tests)} passed,
        ${summary.failedAccessibility} ${pluralizedWord('test', summary.tests)} failed due accessibility violations,
        ${summary.failed} ${pluralizedWord('test', summary.tests)} failed for other reasons,
        ${summary.pending + summary.skipped} ${pluralizedWord('test', summary.tests)} skipped or pending,
    `
}

const createTestVoiceControlsInCypressLog = (testTitle, skipVoiceForTestHeader = false) => {

    if (!testTitle) {
        // First time after test run completed

        // Spec Name
        specResults.specName = Cypress.spec.name

        // Get spec summary voice message
        specResults.specSummaryVoice = obtainSpecSummaryVoiceMessage()

        const $specElement = findSpecElement();
        createVoiceButtons($specElement, '.spec-summary-voice-control', specResults.specSummaryVoice)

        for (const [testTitle, testResults] of Object.entries(specResults.testsResults)) {
            createVoiceControlsForTest(testResults)
        }
    } else {
        // After an expand/collapse event
        const testResults = specResults.testsResults[testTitle]

        if (testResults) {
            // console.log('skipVoiceForTestHeader', skipVoiceForTestHeader)
            createVoiceControlsForTest(testResults, skipVoiceForTestHeader)
        }

    }
}

/**
 * Generates a voice message summarizing the test results at the Test level (passed/failed/pending/etc.).
 *
 * @param {Object} test - The test object containing the test results.
 * @returns {string} - The voice message summarizing the test results.
 */
const obtainTestSummaryVoiceMessage = (test) => {
    const attempts = test._currentRetry > 0 ? ` after ${test._currentRetry + 1} attempts` : ''

    const title = testResults.testTitle
    if (testResults.testState === 'passed') {
        // Passed
        return `The test with name. ${title}, passed ${attempts} with no accessibility violations or any other errors.`
    } else if (testResults.testState === 'skipped') {
        // Skipped
        return `The test with name. ${title}, was skipped because some error occurred.`
    } else if (testResults.testState === 'failed') {
        // Failed
        const numViolations = testResults.violations ? testResults.violations.length : 0
        if (numViolations === 0) {
            // Other then accessibility
            return `The test with name, ${title}, failed ${attempts} for reasons other than accessibility violations. Failure cause: ${test.err.message}`
            // return `The test with name, ${title}, failed ${attempts} for reasons other than accessibility violations.`
        } else {
            // Accessibility
            let error = `The test with name, ${title}, failed ${attempts} because ${numViolations} accessibility violations ${pluralizedWord('was', numViolations)} detected: `
            for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
                error += `${totalPerImpact} ${impact} ${pluralizedWord('violation', totalPerImpact)}!`
            }
            return error
        }
    } else {
        // Some other error
        return `The test with name, ${title}, failed ${attempts} for some reason.`
    }
}

/**
 * Generate a voice message with the accessibility violations summary at the Violation level, calling also function to do at the DOM Element level.
 * 
 * @param {Array} violations - An array of accessibility violations.
 * @returns {Object} - The results of the accessibility violations.
 */
const obtainViolationsResultsVoiceMessage = (violations = []) => {
    let violationsResults = {}

    violations.forEach((violation) => {
        const impact = violation.impact
        const help = violation.help
        const description = violation.description

        const violationName = `${impact} violation: ${help}`
        const numNodes = violation.nodes.length

        violationsResults[violationName.toUpperCase()] = {
            violationImpact: impact,
            violationHelp: help,
            violationSummary: { numNodes },
            violationSummaryVoice:
                `${numNodes} Document Object Model ${pluralizedWord('element', numNodes)} ${pluralizedWord('was', numNodes)} found with the ${impact} violation: ` +
                `${help}. ${description}.`,
            nodes: obtainNodesResultsVoiceMessage(violation.nodes, impact, help, description)
        }
    })

    return violationsResults
}

/**
 * Generate a voice message with the accessibility violations details for each node.
 *
 * @param {Array} nodes - The array of nodes to process.
 * @param {string} impact - The impact of the violation.
 * @param {string} help - The help message for the violation.
 * @param {string} description - The description of the violation.
 * @returns {Object} - An object containing the results of accessibility violations for each node.
 */
const obtainNodesResultsVoiceMessage = (nodes, impact, help, description) => {
    let nodesResults = {}

    nodes.forEach((node, index) => {
        const target = node.target[0]
        const failureSummary = node.failureSummary

        nodesResults[target] = {
            nodeName: target,
            nodeSummaryVoice:
                `The Document Object Model element with selector, "${target}", was found with the ${impact} violation: ${help}. ` +
                `${description}. ${failureSummary}.`,
        }
    })

    return nodesResults
}
/**
 * Creates voice controls in Cypress log based on the provided test results.
 * 
 * @param {Object} testResults - The test results object.
 * @param {string} testResults.testTitle - The title of the test.
 * @param {string} testResults.testSummaryVoice - The voice summary of the test.
 * @param {Object} testResults.violationsResults - The violations results object.
 * @param {string} testResults.violationsResults.violationName - The name of the violation.
 * @param {Object} testResults.violationsResults.violationInfo - The information about the violation.
 * @param {string} testResults.violationsResults.violationInfo.violationSummaryVoice - The voice summary of the violation.
 * @param {number} testResults.violationsResults.violationInfo.violationSummary.numNodes - The number of nodes affected by the violation.
 * @param {Object} testResults.violationsResults.violationInfo.nodes - The nodes affected by the violation.
 * @param {Object} testResults.violationsResults.violationInfo.nodes.nodeName - The selector for the node affected by the violation.
 * @param {Object} testResults.violationsResults.violationInfo.nodes.nodeSumaryVoice - The accessibility summary for the node affected by the violation.
 */
const createVoiceControlsForTest = (testResults, skipVoiceForTestHeader = false) => {
    // Get test information
    const testTitle = testResults.testTitle;
    const testSummaryVoice = testResults.testSummaryVoice;

    // Find test within Cypress Log
    const $testElement = findTestElement(testTitle);

    if ($testElement.length === 1) {// This is a '.runnable-title' element (immediate sibilings are '.runnable-controls')
        // Create voice buttons for Test
        if (!skipVoiceForTestHeader) {
            createVoiceButtons($testElement, '.runnable-controls', testSummaryVoice)
        }

        // Process all the Violations for each test
        for (const [violationName, violationInfo] of Object.entries(testResults.violationsResults)) {
            // Get violation information
            const violationSummaryVoice = violationInfo.violationSummaryVoice
            const numNodes = violationInfo.violationSummary.numNodes
            const nodes = violationInfo.nodes

            // Find violation for the test within the Cypress Log
            const $violationElement = findViolationElement($testElement, violationInfo.violationImpact, violationInfo.violationHelp)

            if ($violationElement.length === 1) {  // This is a '.command-info' element (immediate sibilings are '.command-controls')
                // Create voice buttons for Test
                createVoiceButtons($violationElement, '.command-controls', violationSummaryVoice)

                // Process all the Nodes affected (DOM Elements) for each violation
                let $nodeLI = $violationElement.closest('li') // <li> for the violation
                for (let i = 0; i < numNodes; i++) {
                    $nodeLI = $nodeLI.next() // <li> for the node

                    // Find node for the violation within the Cypress Log
                    const $nodeElement = findNodeElement($nodeLI)
                    if ($nodeElement.length === 1) {  // This is a '.command-info' element (immediate sibilings are '.command-controls')
                        const selector = $nodeElement.find('.command-message-text').text()
                        const violationSummaryVoice = nodes[selector].nodeSummaryVoice

                        createVoiceButtons($nodeElement, '.command-controls', violationSummaryVoice)
                    }
                }
            }
        }
    }
}


const findSpecElement = () => {
    return Cypress.$('.runnable-header .duration', window.top?.document)
}

/**
 * Finds a test In the Cypress log based on the provided test title.
 * 
 * @param {string} testTitle - The title of the test to search for.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that test in the Cypress log.
 */
const findTestElement = (testTitle) => {
    // Returns a jquery object for an element of type test that has a class '.runnable-title' (the immediate sibilings are '.runnable-controls')
    return Cypress.$(`.test.runnable .runnable-title span:contains("${testTitle}")`, window.top?.document).filter((index, elem) => {
        // Test title name must exact match
        return Cypress.$(elem).text() === testTitle ? true : false;
    }).parent()
}

/**
 * Finds a violation element based on the provided parameters.
 *
 * @param {jQuery} $testElement - The jQuery object representing the DOM element for the test.
 * @param {string} impact - The impact of the violation.
 * @param {string} help - The help message of the violation.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that violation in the Cypress log.
 */
const findViolationElement = ($testElement, impact, help) => {
    // Returns a jquery object for an element of type violation that has a class '.command-info' (the immediate sibilings are '.command-controls')
    return $testElement.closest('li').find(`li span.command-info`).filter((index, elem) => {
        const $elem = Cypress.$(elem);
        return $elem.find(`.command-method span:contains("${impact.toUpperCase()}")`).length === 1 &&
            $elem.find(`.command-message-text:contains("${help.toUpperCase()}")`).length === 1
            ? true : false;
    })
}

/**
 * Finds a violation element based on the provided parameters.
 *
 * @param {jQuery} $nodeLI - The jQuery object representing the DOM element for the <li> tag with the list of nodes affected by the current processed violation.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that node in the Cypress log.
 */
const findNodeElement = ($nodeLI) => {
    // Returns a object element of type node for an element with class '.command-info' (the immediate sibilings are '.command-controls')
    return $nodeLI.find(`span.command-info`)
}



/**
 * Represents the SVGs for the Play, Pause, Resume and Stop voice buttons.
 *
 * @type {string}
 */
const playSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z" fill="#51ac10"/>
</svg>`
const pauseSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z" fill="#ebf635"/>
<path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z" fill="#ebf635"/>
</svg>`
const resumeSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10.2929 1.29289C10.6834 0.902369 11.3166 0.902369 11.7071 1.29289L14.7071 4.29289C14.8946 4.48043 15 4.73478 15 5C15 5.26522 14.8946 5.51957 14.7071 5.70711L11.7071 8.70711C11.3166 9.09763 10.6834 9.09763 10.2929 8.70711C9.90237 8.31658 9.90237 7.68342 10.2929 7.29289L11.573 6.01281C7.90584 6.23349 5 9.2774 5 13C5 16.866 8.13401 20 12 20C15.866 20 19 16.866 19 13C19 12.4477 19.4477 12 20 12C20.5523 12 21 12.4477 21 13C21 17.9706 16.9706 22 12 22C7.02944 22 3 17.9706 3 13C3 8.16524 6.81226 4.22089 11.5947 4.00896L10.2929 2.70711C9.90237 2.31658 9.90237 1.68342 10.2929 1.29289Z" fill="#278fee"/>
</svg>`
const stopSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" fill="#dddddd"/>
</svg>`


/**
 * Creates voice buttons for controlling voice messages.
 * 
 * @param {jQuery} $element - The element to which the voice buttons will be appended.
 * @param {string} controlsSelector - The selector for finding the placeholder for controls.
 * @param {string} testSummaryVoice - The voice message to be played.
 */
const createVoiceButtons = ($element, controlsSelector, testSummaryVoice) => {
    // Obtain place holder for controls and create if does not exist
    let $controls = $element.siblings(controlsSelector)
    if ($controls.length === 0) {
        // Create controls
        $controls = Cypress.$(`<span class="${controlsSelector.replace('.', '')}"></span>`)
        $element.after($controls)
    }

    const voiceGroupId = Cypress._.uniqueId()
    const playButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-play" role="button" title="Play result"><span>${playSvg}</span></span>`
    const pauseButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-pause voice-hidden" role="button" title="Pause result"><span>${pauseSvg}</span></span>`
    const resumeButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-resume voice-hidden" role="button" title="Resume result"><span>${resumeSvg}</span></span>`
    const stopButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-stop voice-hidden" role="button" title="Stop result"><span>${stopSvg}</span></span>`

    const doc = window.top?.document

    const $play = Cypress.$(playButton).on('click', (e) => { playVoiceMessage(e, doc, voiceGroupId, testSummaryVoice) })
    const $pause = Cypress.$(pauseButton).on('click', (e) => { pauseVoiceMessage(e, doc, voiceGroupId) })
    const $resume = Cypress.$(resumeButton).on('click', (e) => { resumeVoiceMessage(e, doc, voiceGroupId) })
    const $stop = Cypress.$(stopButton).on('click', (e) => { stopVoiceMessage(e, doc, voiceGroupId) })

    $controls.append($play, $pause, $resume, $stop)
}


/**
 * Resets the voice controls based on the provided parameters.
 * 
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 * @param {string} enabledSelector - The selector for voice controls to enable.
 */
const resetVoiceControls = (doc, voiceGroupId, enabledSelector) => {
    const $voiceGroup = Cypress.$(`[data-voice-group="${voiceGroupId}"]`, doc)
    // Hide all voice buttons
    $voiceGroup.addClass('voice-hidden')
    // Show the voice buttons that must be enabled
    $voiceGroup.filter(enabledSelector).removeClass('voice-hidden')
}

/**
 * Play the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 * @param {string} voiceMessage - Voice message to play.
 */
const playVoiceMessage = (e, doc, voiceGroupId, voiceMessage) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Cancel any previous voice message
    wickVoice.cancel()

    // Hide any other voice buttons that is not Play from other voice groups
    // (this is for the case when a voice message is playing and the user clicks play on a different voice message)
    Cypress.$(`.voice-play`, doc).removeClass('voice-hidden')
    Cypress.$(`.voice-pause, .voice-resume, .voice-stop`, doc).addClass('voice-hidden')

    // Reset the controls to show the Pause and Stop buttons
    resetVoiceControls(doc, voiceGroupId, `.voice-pause, .voice-stop`)

    // Create a new voice message
    const speechMessage = new SpeechSynthesisUtterance(voiceMessage)
    speechMessage.onend = (event) => {
        // When the voice message ends, reset the controls to show the Play button
        resetVoiceControls(doc, voiceGroupId, `.voice-play`)
    }

    // Play the voice message
    wickVoice.speak(speechMessage)
}

/**
 * Pause the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const pauseVoiceMessage = (e, doc, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Reset the controls to show the Resume and Stop buttons
    resetVoiceControls(doc, voiceGroupId, `.voice-resume, .voice-stop`)

    // Pause the voice message
    wickVoice.pause()
}

/**
 * Resume the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const resumeVoiceMessage = (e, doc, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Reset the controls to show the Pause and Stop buttons
    resetVoiceControls(doc, voiceGroupId, `.voice-pause, .voice-stop`)

    // Resume the voice message
    wickVoice.resume()
}

/**
 * Stops the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const stopVoiceMessage = (e, doc, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Reset the controls to show the Play button
    resetVoiceControls(doc, voiceGroupId, `.voice-play`)

    // Stop the voice message
    wickVoice.cancel()
}


/**
 * Determines if voice accessibility should be enabled.
 * @returns {boolean} - True if voice accessibility should be enabled, false otherwise.
 */
const mustEnableVoice = () => {
    return Cypress.config('isInteractive') && Cypress.env('enableAccessibilityVoice')
}


/**
 * Returns the plural form of a word based on the count.
 *
 * @param {string} word - The word to be pluralized.
 * @param {number} count - The count to determine the plural form.
 * @returns {string} The plural form of the word.
 */
const pluralizedWord = (word, count) => {
    if (word === 'violation') {
        return count === 1 ? 'violation' : 'violations'
    } else if (word === 'was') {
        return count === 1 ? 'was' : 'were'
    } else if (word === 'element') {
        return count === 1 ? 'element' : 'elements'
    } else if (word === 'test') {
        return count === 1 ? 'test' : 'tests'
    }
}


/**
 * Creates and appends CSS styles for voice buttons.
 */
const createVoiceCssStyles = () => {
    const styles = `
        .spec-summary-voice-control {
            float: right;
            line-height: 16px;
            padding: 2px 6px;
        }

        .voice-button {
            margin-left: 12px;
        }
        
        .voice-hidden {
            display: none !important;
        }
    `

    // Append the styles to the document head only once
    const $head = Cypress.$(window.top?.document.head)
    const hasVoiceStyles = $head.find("#voiceStyles");
    if (!hasVoiceStyles.length) {
        const $voiceStyles = Cypress.$(`<style id="voiceStyles">${styles}</style>`)
        $head.append($voiceStyles)
    }
}


